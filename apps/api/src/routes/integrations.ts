import { createHash, randomBytes } from 'node:crypto';
import {
  type AuthorizeIntegrationResponse,
  type ExchangeIntegrationTokenResponse,
  INTEGRATION_REDIRECT_URI,
  INTEGRATION_SCOPES,
  type IntegrationProvider,
  isEnterpriseIntegrationProvider,
  isIntegrationProvider,
  type RefreshIntegrationTokenResponse,
} from '@xcreener/integrations-core';
import { hasEnterpriseIntegrationsAccess } from '@xcreener/team-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { customAlphabet } from 'nanoid';
import type * as schema from '../db/schema';
import { env } from '../env';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { bestPlanForUser } from '../services/entitlement';
import {
  canSealRefreshTokens,
  openRefreshHandle,
  sealRefreshToken,
} from '../services/integration-tokens';
import { savePendingIntegrationOAuth, takePendingIntegrationOAuth } from '../services/redis';

const createState = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24);

const ENTERPRISE_PLAN_ERROR = 'Jira, Confluence and Microsoft Teams require Team Pro';

interface IntegrationRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

/** Enterprise providers are a Team Pro feature: checked here, not only in the desktop UI. */
async function lacksEnterpriseAccess(
  db: PostgresJsDatabase<typeof schema>,
  request: FastifyRequest,
  provider: IntegrationProvider
): Promise<boolean> {
  if (!isEnterpriseIntegrationProvider(provider)) {
    return false;
  }
  const authUser = request.authUser;
  if (!authUser) {
    return true;
  }
  const user = await upsertAuthUser(db, authUser.auth0Sub, authUser.email);
  return !hasEnterpriseIntegrationsAccess(await bestPlanForUser(db, user.id));
}

interface ProviderOAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  extraAuthorizeParams?: Record<string, string>;
  /** Provider documents PKCE (S256) for confidential clients. */
  pkce?: boolean;
}

function providerConfig(provider: IntegrationProvider): ProviderOAuthConfig | null {
  switch (provider) {
    case 'slack':
      if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        clientId: env.SLACK_CLIENT_ID,
        clientSecret: env.SLACK_CLIENT_SECRET,
        scope: INTEGRATION_SCOPES.slack,
      };
    case 'notion':
      if (!env.NOTION_CLIENT_ID || !env.NOTION_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        clientId: env.NOTION_CLIENT_ID,
        clientSecret: env.NOTION_CLIENT_SECRET,
        extraAuthorizeParams: { owner: 'user' },
      };
    case 'linear':
      if (!env.LINEAR_CLIENT_ID || !env.LINEAR_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://linear.app/oauth/authorize',
        tokenUrl: 'https://api.linear.app/oauth/token',
        clientId: env.LINEAR_CLIENT_ID,
        clientSecret: env.LINEAR_CLIENT_SECRET,
        scope: INTEGRATION_SCOPES.linear,
        extraAuthorizeParams: { response_type: 'code' },
        pkce: true,
      };
    case 'github':
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: INTEGRATION_SCOPES.github,
        pkce: true,
      };
    case 'jira':
    case 'confluence':
      if (!env.ATLASSIAN_CLIENT_ID || !env.ATLASSIAN_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://auth.atlassian.com/authorize',
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        clientId: env.ATLASSIAN_CLIENT_ID,
        clientSecret: env.ATLASSIAN_CLIENT_SECRET,
        scope: INTEGRATION_SCOPES[provider],
        extraAuthorizeParams: {
          audience: 'api.atlassian.com',
          prompt: 'consent',
          response_type: 'code',
        },
      };
    case 'msteams':
      if (!env.MS_TEAMS_CLIENT_ID || !env.MS_TEAMS_CLIENT_SECRET) {
        return null;
      }
      return {
        authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        clientId: env.MS_TEAMS_CLIENT_ID,
        clientSecret: env.MS_TEAMS_CLIENT_SECRET,
        scope: INTEGRATION_SCOPES.msteams,
        extraAuthorizeParams: { response_type: 'code' },
        pkce: true,
      };
  }
}

function codeChallengeFor(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

function buildAuthorizeUrl(
  config: ProviderOAuthConfig,
  state: string,
  codeVerifier: string
): string {
  const redirectUri = env.INTEGRATIONS_REDIRECT_URI || INTEGRATION_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state,
    ...(config.scope ? { scope: config.scope } : {}),
    ...(config.extraAuthorizeParams ?? {}),
    ...(config.pkce
      ? { code_challenge: codeChallengeFor(codeVerifier), code_challenge_method: 'S256' }
      : {}),
  });

  if (config.authorizeUrl.includes('notion.com')) {
    params.set('response_type', 'code');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

const PROVIDER_TIMEOUT_MS = 10_000;

/** Providers whose access tokens expire and come with a refresh token. */
const REFRESHABLE_PROVIDERS: ReadonlySet<IntegrationProvider> = new Set([
  'linear',
  'jira',
  'confluence',
  'msteams',
]);

/** What the provider returned. The raw refresh token is sealed before anything reaches the client. */
type ProviderTokens = Omit<ExchangeIntegrationTokenResponse, 'refreshHandle'> & {
  refreshToken?: string | null;
};

/** The provider refused the refresh token (revoked, expired, already rotated). */
class ProviderRejectedError extends Error {}

async function refreshProviderToken(
  provider: IntegrationProvider,
  config: ProviderOAuthConfig,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string | null }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });
  if (provider === 'msteams' && config.scope) {
    body.set('scope', config.scope);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new ProviderRejectedError(`${provider} refused the refresh token`);
  }
  if (!response.ok) {
    throw new Error(`${provider} token refresh failed`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const accessToken = payload.access_token as string | undefined;
  const expiresIn = payload.expires_in as number | undefined;
  if (!accessToken) {
    throw new Error(`${provider} token missing from refresh response`);
  }
  return {
    accessToken,
    // Linear, Atlassian and Microsoft rotate refresh tokens; keep the old one if one did not.
    refreshToken: (payload.refresh_token as string | undefined) ?? refreshToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

async function exchangeProviderToken(
  provider: IntegrationProvider,
  config: ProviderOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<ProviderTokens> {
  const redirectUri = env.INTEGRATIONS_REDIRECT_URI || INTEGRATION_REDIRECT_URI;

  if (provider === 'notion') {
    const credentials = btoa(`${config.clientId}:${config.clientSecret}`);
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error('Notion token exchange failed');
    }

    const payload = (await response.json()) as {
      access_token: string;
      workspace_name?: string;
      bot_id?: string;
    };

    return {
      accessToken: payload.access_token,
      workspaceName: payload.workspace_name ?? null,
      metadata: payload.bot_id ? { botId: payload.bot_id } : undefined,
    };
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  if (config.pkce) {
    body.set('code_verifier', codeVerifier);
  }

  if (provider === 'linear') {
    body.set('grant_type', 'authorization_code');
  }

  if (provider === 'jira' || provider === 'confluence' || provider === 'msteams') {
    body.set('grant_type', 'authorization_code');
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${provider} token exchange failed`);
  }

  const payload = (await response.json()) as Record<string, unknown>;

  if (provider === 'slack') {
    if (!payload.ok) {
      throw new Error(String(payload.error ?? 'Slack token exchange failed'));
    }
    const authed = payload.authed_user as { access_token?: string } | undefined;
    const team = payload.team as { name?: string } | undefined;
    const token = authed?.access_token ?? (payload.access_token as string | undefined);
    if (!token) {
      throw new Error('Slack token missing from response');
    }
    return {
      accessToken: token,
      workspaceName: team?.name ?? null,
    };
  }

  if (provider === 'linear') {
    const accessToken = payload.access_token as string | undefined;
    const expiresIn = payload.expires_in as number | undefined;
    if (!accessToken) {
      throw new Error('Linear token missing from response');
    }
    return {
      accessToken,
      refreshToken: (payload.refresh_token as string | undefined) ?? null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    };
  }

  if (provider === 'jira' || provider === 'confluence') {
    const accessToken = payload.access_token as string | undefined;
    const expiresIn = payload.expires_in as number | undefined;
    if (!accessToken) {
      throw new Error(`${provider} token missing from response`);
    }

    const resourcesResponse = await fetch(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      }
    );
    if (!resourcesResponse.ok) {
      throw new Error(`${provider} accessible resources lookup failed`);
    }
    const resources = (await resourcesResponse.json()) as Array<{
      id: string;
      name: string;
      url: string;
    }>;
    const site = resources[0];

    return {
      accessToken,
      refreshToken: (payload.refresh_token as string | undefined) ?? null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      workspaceName: site?.name ?? null,
      metadata: site ? { cloudId: site.id, siteUrl: site.url } : undefined,
    };
  }

  if (provider === 'msteams') {
    const accessToken = payload.access_token as string | undefined;
    const expiresIn = payload.expires_in as number | undefined;
    if (!accessToken) {
      throw new Error('Microsoft Teams token missing from response');
    }
    return {
      accessToken,
      refreshToken: (payload.refresh_token as string | undefined) ?? null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    };
  }

  const accessToken = payload.access_token as string | undefined;
  if (!accessToken) {
    throw new Error('GitHub token missing from response');
  }

  return {
    accessToken,
    metadata: typeof payload.scope === 'string' ? { scope: payload.scope } : undefined,
  };
}

export async function registerIntegrationRoutes(
  app: FastifyInstance,
  options: IntegrationRouteOptions
) {
  app.get(
    '/v1/integrations/:provider/authorize',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { provider: rawProvider } = request.params as { provider: string };
      if (!isIntegrationProvider(rawProvider)) {
        return reply.code(400).send({ error: 'Unknown integration provider' });
      }

      if (await lacksEnterpriseAccess(options.db, request, rawProvider)) {
        return reply.code(403).send({ error: ENTERPRISE_PLAN_ERROR });
      }

      const config = providerConfig(rawProvider);
      if (!config) {
        return reply.code(503).send({ error: 'Integration provider is not configured' });
      }

      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);

      // The state is checked here on exchange, not only by the desktop: a code intercepted
      // through the custom scheme cannot be redeemed by another Xcreener account.
      const state = createState();
      const codeVerifier = randomBytes(32).toString('base64url');
      await savePendingIntegrationOAuth(state, {
        userId: user.id,
        provider: rawProvider,
        codeVerifier,
      });

      const response: AuthorizeIntegrationResponse = {
        authorizeUrl: buildAuthorizeUrl(config, state, codeVerifier),
        state,
      };

      return reply.send(response);
    }
  );

  app.post(
    '/v1/integrations/:provider/token',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { provider: rawProvider } = request.params as { provider: string };
      if (!isIntegrationProvider(rawProvider)) {
        return reply.code(400).send({ error: 'Unknown integration provider' });
      }

      if (await lacksEnterpriseAccess(options.db, request, rawProvider)) {
        return reply.code(403).send({ error: ENTERPRISE_PLAN_ERROR });
      }

      const config = providerConfig(rawProvider);
      if (!config) {
        return reply.code(503).send({ error: 'Integration provider is not configured' });
      }

      const body = request.body as { code?: unknown; state?: unknown } | undefined;
      if (typeof body?.code !== 'string' || !body.code) {
        return reply.code(400).send({ error: 'Missing authorization code' });
      }
      if (typeof body.state !== 'string' || !body.state) {
        return reply.code(400).send({ error: 'Missing OAuth state' });
      }

      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const pending = await takePendingIntegrationOAuth(body.state);
      if (!pending || pending.userId !== user.id || pending.provider !== rawProvider) {
        return reply.code(400).send({ error: 'Invalid or expired OAuth state' });
      }

      try {
        const { refreshToken, ...tokens } = await exchangeProviderToken(
          rawProvider,
          config,
          body.code,
          pending.codeVerifier
        );
        const response: ExchangeIntegrationTokenResponse = {
          ...tokens,
          refreshHandle: refreshToken ? sealRefreshToken(refreshToken, user.id, rawProvider) : null,
        };
        return reply.send(response);
      } catch (error) {
        // Provider messages can carry provider-side detail; keep them in logs only.
        request.log.warn(
          { err: error, provider: rawProvider },
          'Integration token exchange failed'
        );
        return reply.code(502).send({ error: 'Token exchange failed' });
      }
    }
  );

  app.post(
    '/v1/integrations/:provider/refresh',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { provider: rawProvider } = request.params as { provider: string };
      if (!isIntegrationProvider(rawProvider) || !REFRESHABLE_PROVIDERS.has(rawProvider)) {
        return reply.code(400).send({ error: 'This integration does not refresh tokens' });
      }

      if (await lacksEnterpriseAccess(options.db, request, rawProvider)) {
        return reply.code(403).send({ error: ENTERPRISE_PLAN_ERROR });
      }

      const config = providerConfig(rawProvider);
      if (!config || !canSealRefreshTokens()) {
        return reply.code(503).send({ error: 'Integration refresh is not configured' });
      }

      const body = request.body as { refreshHandle?: unknown } | undefined;
      if (typeof body?.refreshHandle !== 'string' || !body.refreshHandle) {
        return reply.code(400).send({ error: 'Missing refresh handle' });
      }

      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const refreshToken = openRefreshHandle(body.refreshHandle, user.id, rawProvider);
      if (!refreshToken) {
        return reply.code(400).send({ error: 'Reconnect this integration' });
      }

      try {
        const refreshed = await refreshProviderToken(rawProvider, config, refreshToken);
        const refreshHandle = sealRefreshToken(refreshed.refreshToken, user.id, rawProvider);
        if (!refreshHandle) {
          return reply.code(503).send({ error: 'Integration refresh is not configured' });
        }
        const response: RefreshIntegrationTokenResponse = {
          accessToken: refreshed.accessToken,
          refreshHandle,
          expiresAt: refreshed.expiresAt,
        };
        return reply.send(response);
      } catch (error) {
        if (error instanceof ProviderRejectedError) {
          return reply.code(400).send({ error: 'Reconnect this integration' });
        }
        request.log.warn({ err: error, provider: rawProvider }, 'Integration token refresh failed');
        return reply.code(502).send({ error: 'Token refresh failed' });
      }
    }
  );
}

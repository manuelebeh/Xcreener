import {
  INTEGRATION_REDIRECT_URI,
  INTEGRATION_SCOPES,
  type AuthorizeIntegrationResponse,
  type ExchangeIntegrationTokenResponse,
  type IntegrationProvider,
  isIntegrationProvider,
} from '@snapglow/integrations-core';
import { customAlphabet } from 'nanoid';
import type { FastifyInstance } from 'fastify';
import { env } from '../env';
import { authenticateRequest } from '../plugins/auth';

const createState = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24);

interface ProviderOAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  extraAuthorizeParams?: Record<string, string>;
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
      };
  }
}

function buildAuthorizeUrl(config: ProviderOAuthConfig, state: string): string {
  const redirectUri = env.INTEGRATIONS_REDIRECT_URI || INTEGRATION_REDIRECT_URI;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state,
    ...(config.scope ? { scope: config.scope } : {}),
    ...(config.extraAuthorizeParams ?? {}),
  });

  if (config.authorizeUrl.includes('notion.com')) {
    params.set('response_type', 'code');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

async function exchangeProviderToken(
  provider: IntegrationProvider,
  config: ProviderOAuthConfig,
  code: string
): Promise<ExchangeIntegrationTokenResponse> {
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

  if (provider === 'linear') {
    body.set('grant_type', 'authorization_code');
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
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

  const accessToken = payload.access_token as string | undefined;
  if (!accessToken) {
    throw new Error('GitHub token missing from response');
  }

  return {
    accessToken,
    metadata: typeof payload.scope === 'string' ? { scope: payload.scope } : undefined,
  };
}

export async function registerIntegrationRoutes(app: FastifyInstance) {
  app.get('/v1/integrations/:provider/authorize', { preHandler: authenticateRequest }, async (request, reply) => {
    const { provider: rawProvider } = request.params as { provider: string };
    if (!isIntegrationProvider(rawProvider)) {
      return reply.code(400).send({ error: 'Unknown integration provider' });
    }

    const config = providerConfig(rawProvider);
    if (!config) {
      return reply.code(503).send({ error: 'Integration provider is not configured' });
    }

    const state = createState();
    const response: AuthorizeIntegrationResponse = {
      authorizeUrl: buildAuthorizeUrl(config, state),
      state,
    };

    return reply.send(response);
  });

  app.post('/v1/integrations/:provider/token', { preHandler: authenticateRequest }, async (request, reply) => {
    const { provider: rawProvider } = request.params as { provider: string };
    if (!isIntegrationProvider(rawProvider)) {
      return reply.code(400).send({ error: 'Unknown integration provider' });
    }

    const config = providerConfig(rawProvider);
    if (!config) {
      return reply.code(503).send({ error: 'Integration provider is not configured' });
    }

    const body = request.body as { code?: string };
    if (!body?.code) {
      return reply.code(400).send({ error: 'Missing authorization code' });
    }

    try {
      const tokens = await exchangeProviderToken(rawProvider, config, body.code);
      return reply.send(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token exchange failed';
      return reply.code(502).send({ error: message });
    }
  });
}

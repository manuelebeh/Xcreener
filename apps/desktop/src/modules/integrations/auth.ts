import { openUrl } from '@tauri-apps/plugin-opener';
import {
  INTEGRATION_LABELS,
  type IntegrationProvider,
  type RefreshIntegrationTokenResponse,
} from '@xcreener/integrations-core';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { getApiUrl } from '@/modules/cloud/config';
import { deepLinkRoute } from '@/shared/lib/deepLink';
import { getIntegrationsRedirectUri, isIntegrationsConfigured } from './config';
import {
  clearIntegrationToken,
  type StoredIntegrationToken,
  saveIntegrationToken,
} from './tokenStorage';

interface PendingIntegrationLogin {
  provider: IntegrationProvider;
  state: string;
}

let pendingLogin: PendingIntegrationLogin | null = null;

export async function startIntegrationLogin(provider: IntegrationProvider): Promise<void> {
  if (!isIntegrationsConfigured()) {
    throw new Error('Configure VITE_API_URL to connect integrations');
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to Xcreener cloud before connecting integrations');
  }

  const response = await fetch(`${getApiUrl()}/v1/integrations/${provider}/authorize`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to start ${provider} OAuth`);
  }

  // The API generates the state and embeds it in authorizeUrl; the callback must echo it back.
  const payload = (await response.json()) as { authorizeUrl: string; state: string };
  const authorizeUrl = new URL(payload.authorizeUrl);
  if (!payload.state || authorizeUrl.searchParams.get('state') !== payload.state) {
    throw new Error('OAuth state mismatch');
  }
  if (authorizeUrl.protocol !== 'https:') {
    throw new Error('Refusing to open a non-https authorization URL');
  }

  pendingLogin = { provider, state: payload.state };
  await openUrl(authorizeUrl.toString());
}

export async function handleIntegrationCallback(
  url: string
): Promise<StoredIntegrationToken | null> {
  const parsed = new URL(url);
  if (deepLinkRoute(parsed) !== 'integrations/callback') {
    return null;
  }

  const error = parsed.searchParams.get('error');
  if (error) {
    throw new Error(parsed.searchParams.get('error_description') ?? error);
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  if (!code || !state || !pendingLogin || pendingLogin.state !== state) {
    throw new Error('Invalid integration callback');
  }

  const provider = pendingLogin.provider;
  pendingLogin = null;

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to Xcreener cloud before connecting integrations');
  }

  const response = await fetch(`${getApiUrl()}/v1/integrations/${provider}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      state,
      redirectUri: getIntegrationsRedirectUri(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to connect ${provider}`);
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshHandle?: string | null;
    expiresAt?: string | null;
    workspaceName?: string | null;
    metadata?: Record<string, string>;
  };

  const stored: StoredIntegrationToken = {
    accessToken: payload.accessToken,
    refreshHandle: payload.refreshHandle ?? null,
    expiresAt: payload.expiresAt ?? null,
    accountLabel: payload.workspaceName ?? provider,
    metadata: payload.metadata,
  };

  await saveIntegrationToken(provider, stored);
  return stored;
}

const refreshing = new Map<IntegrationProvider, Promise<StoredIntegrationToken | null>>();

/**
 * New provider access token from the API. Null when the user has to reconnect. Calls for the
 * same provider share one request: providers rotate refresh tokens, so a second refresh with
 * the old handle would fail.
 */
export function refreshIntegrationToken(
  provider: IntegrationProvider,
  token: StoredIntegrationToken
): Promise<StoredIntegrationToken | null> {
  const inFlight = refreshing.get(provider);
  if (inFlight) {
    return inFlight;
  }
  const request = requestRefresh(provider, token).finally(() => refreshing.delete(provider));
  refreshing.set(provider, request);
  return request;
}

async function requestRefresh(
  provider: IntegrationProvider,
  token: StoredIntegrationToken
): Promise<StoredIntegrationToken | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken || !token.refreshHandle) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/v1/integrations/${provider}/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshHandle: token.refreshHandle }),
  });

  if (response.status === 400) {
    // The provider or the API refused the handle: only reconnecting helps.
    await clearIntegrationToken(provider);
    return null;
  }
  if (response.status === 503) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to refresh ${INTEGRATION_LABELS[provider]}`);
  }

  const payload = (await response.json()) as RefreshIntegrationTokenResponse;
  const refreshed: StoredIntegrationToken = {
    ...token,
    accessToken: payload.accessToken,
    refreshHandle: payload.refreshHandle,
    expiresAt: payload.expiresAt ?? null,
  };
  await saveIntegrationToken(provider, refreshed);
  return refreshed;
}

export function getPendingIntegrationProvider(): IntegrationProvider | null {
  return pendingLogin?.provider ?? null;
}

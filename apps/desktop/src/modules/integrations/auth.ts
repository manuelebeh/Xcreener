import { openUrl } from '@tauri-apps/plugin-opener';
import type { IntegrationProvider } from '@snapglow/integrations-core';
import { createOAuthState } from '@/modules/cloud/pkce';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { getApiUrl } from '@/modules/cloud/config';
import { getIntegrationsRedirectUri, isIntegrationsConfigured } from './config';
import { saveIntegrationToken, type StoredIntegrationToken } from './tokenStorage';

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
    throw new Error('Sign in to SnapGlow cloud before connecting integrations');
  }

  const state = createOAuthState();
  pendingLogin = { provider, state };

  const response = await fetch(`${getApiUrl()}/v1/integrations/${provider}/authorize`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to start ${provider} OAuth`);
  }

  const payload = (await response.json()) as { authorizeUrl: string; state: string };
  if (payload.state !== state) {
    throw new Error('OAuth state mismatch');
  }

  await openUrl(payload.authorizeUrl);
}

export async function handleIntegrationCallback(url: string): Promise<StoredIntegrationToken | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'snapglow:' || parsed.pathname !== '//integrations/callback') {
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
    throw new Error('Sign in to SnapGlow cloud before connecting integrations');
  }

  const response = await fetch(`${getApiUrl()}/v1/integrations/${provider}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      redirectUri: getIntegrationsRedirectUri(),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Failed to connect ${provider}`);
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    workspaceName?: string | null;
    metadata?: Record<string, string>;
  };

  const stored: StoredIntegrationToken = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? null,
    expiresAt: payload.expiresAt ?? null,
    accountLabel: payload.workspaceName ?? provider,
    metadata: payload.metadata,
  };

  await saveIntegrationToken(provider, stored);
  return stored;
}

export function getPendingIntegrationProvider(): IntegrationProvider | null {
  return pendingLogin?.provider ?? null;
}

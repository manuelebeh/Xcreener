import { openUrl } from '@tauri-apps/plugin-opener';
import { createCodeChallenge, createCodeVerifier, createOAuthState } from './pkce';
import { getAuth0Config } from './config';
import { clearAuthTokens, loadAuthTokens, saveAuthTokens, type StoredAuthTokens } from './tokenStorage';

interface PendingLogin {
  codeVerifier: string;
  state: string;
}

let pendingLogin: PendingLogin | null = null;

export async function startAuthLogin(): Promise<void> {
  await startAuthLoginWithOrganization(null);
}

export async function startAuthLoginWithOrganization(organization: string | null): Promise<void> {
  const config = getAuth0Config();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = createOAuthState();
  pendingLogin = { codeVerifier, state };

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid profile email offline_access',
    audience: config.audience,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  if (organization) {
    params.set('organization', organization);
  }

  await openUrl(`https://${config.domain}/authorize?${params.toString()}`);
}

export async function handleAuthCallback(url: string): Promise<StoredAuthTokens | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'snapglow:' || parsed.pathname !== '//auth/callback') {
    return null;
  }

  const error = parsed.searchParams.get('error');
  if (error) {
    throw new Error(parsed.searchParams.get('error_description') ?? error);
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  if (!code || !state || !pendingLogin || pendingLogin.state !== state) {
    throw new Error('Invalid Auth0 callback');
  }

  const tokens = await exchangeAuthorizationCode(code, pendingLogin.codeVerifier);
  pendingLogin = null;
  await saveAuthTokens(tokens);
  return tokens;
}

async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<StoredAuthTokens> {
  const config = getAuth0Config();
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Auth0 authorization code');
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<StoredAuthTokens> {
  const config = getAuth0Config();
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Auth0 session');
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
  };
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadAuthTokens();
  if (!tokens) {
    return null;
  }

  if (tokens.expiresAt && tokens.expiresAt <= Date.now() + 30_000) {
    if (!tokens.refreshToken) {
      await clearAuthTokens();
      return null;
    }
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    await saveAuthTokens(refreshed);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}

export async function signOutCloud(): Promise<void> {
  pendingLogin = null;
  await clearAuthTokens();
}

export async function getCloudAccountLabel(): Promise<string | null> {
  const token = await getValidAccessToken();
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { email?: string };
    return payload.email ?? 'Signed in';
  } catch {
    return 'Signed in';
  }
}

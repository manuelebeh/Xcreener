const STORAGE_KEY = 'snapglow_web_auth_tokens';

interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

function getAuth0Config() {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  if (!domain || !clientId || !audience) {
    throw new Error('Missing Auth0 web configuration');
  }
  return { domain, clientId, audience };
}

export function isWebAuthConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_AUTH0_DOMAIN &&
      import.meta.env.VITE_AUTH0_CLIENT_ID &&
      import.meta.env.VITE_AUTH0_AUDIENCE
  );
}

function loadTokens(): StoredAuthTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuthTokens;
  } catch {
    return null;
  }
}

function saveTokens(tokens: StoredAuthTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) {
    return null;
  }
  if (tokens.expiresAt && tokens.expiresAt <= Date.now() + 30_000) {
    if (!tokens.refreshToken) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const config = getAuth0Config();
    const response = await fetch(`https://${config.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: tokens.refreshToken,
      }),
    });
    if (!response.ok) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const payload = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const refreshed = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? tokens.refreshToken,
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
    };
    saveTokens(refreshed);
    return refreshed.accessToken;
  }
  return tokens.accessToken;
}

export async function startWebAuthLogin(returnTo: string): Promise<void> {
  const config = getAuth0Config();
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const challenge = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(challenge)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const state = crypto.randomUUID();
  sessionStorage.setItem('snapglow_pkce_verifier', verifier);
  sessionStorage.setItem('snapglow_auth_state', state);
  sessionStorage.setItem('snapglow_auth_return_to', returnTo);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: `${window.location.origin}/auth/callback`,
    scope: 'openid profile email offline_access',
    audience: config.audience,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });
  window.location.assign(`https://${config.domain}/authorize?${params.toString()}`);
}

export async function handleWebAuthCallback(code: string, state: string): Promise<void> {
  const expectedState = sessionStorage.getItem('snapglow_auth_state');
  const verifier = sessionStorage.getItem('snapglow_pkce_verifier');
  if (!expectedState || expectedState !== state || !verifier) {
    throw new Error('Invalid Auth0 callback');
  }

  const config = getAuth0Config();
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      redirect_uri: `${window.location.origin}/auth/callback`,
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

  saveTokens({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
  });

  sessionStorage.removeItem('snapglow_pkce_verifier');
  sessionStorage.removeItem('snapglow_auth_state');
}

export function getAuthReturnTo(): string {
  return sessionStorage.getItem('snapglow_auth_return_to') ?? '/';
}

export function clearAuthReturnTo(): void {
  sessionStorage.removeItem('snapglow_auth_return_to');
}

export function signOutWebAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

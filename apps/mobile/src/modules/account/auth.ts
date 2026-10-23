import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { AUTH_REDIRECT_URI, getAuth0Config } from './config';

const TOKENS_KEY = 'snapglow.auth.tokens';
const VERIFIER_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds. */
  expiresAt: number | null;
}

interface Auth0TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

function createCodeVerifier(length = 64): string {
  return Array.from(
    Crypto.getRandomBytes(length),
    (byte) => VERIFIER_CHARSET[byte % VERIFIER_CHARSET.length]
  ).join('');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createState(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

async function loadTokens(): Promise<StoredAuthTokens | null> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuthTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: StoredAuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

async function requestTokens(
  body: Record<string, string>,
  previousRefreshToken: string | null = null
): Promise<StoredAuthTokens> {
  const { domain, clientId } = getAuth0Config();
  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, ...body }),
  });
  if (!response.ok) {
    throw new Error('Auth0 token request failed');
  }
  const payload = (await response.json()) as Auth0TokenResponse;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? previousRefreshToken,
    expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1000 : null,
  };
}

/** Auth0 Universal Login with PKCE. Resolves false when the user cancels. */
export async function signIn(): Promise<boolean> {
  const { domain, clientId, audience } = getAuth0Config();
  const codeVerifier = createCodeVerifier();
  const state = createState();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: AUTH_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    audience,
    code_challenge: await createCodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    state,
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `https://${domain}/authorize?${params.toString()}`,
    AUTH_REDIRECT_URI
  );
  if (result.type !== 'success') {
    return false;
  }

  const callback = new URL(result.url);
  const error = callback.searchParams.get('error');
  if (error) {
    throw new Error(callback.searchParams.get('error_description') ?? error);
  }
  const code = callback.searchParams.get('code');
  if (!code || callback.searchParams.get('state') !== state) {
    throw new Error('Invalid Auth0 callback');
  }

  await saveTokens(
    await requestTokens({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: AUTH_REDIRECT_URI,
    })
  );
  return true;
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}

/** Current access token, refreshed when close to expiry. Null when signed out or refresh fails. */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) {
    return null;
  }
  if (!tokens.expiresAt || tokens.expiresAt > Date.now() + 30_000) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    return null;
  }

  try {
    const refreshed = await requestTokens(
      { grant_type: 'refresh_token', refresh_token: tokens.refreshToken },
      tokens.refreshToken
    );
    await saveTokens(refreshed);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

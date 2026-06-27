import { getSetting, setSetting } from '@/db';

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

const TOKEN_KEY = 'cloudAuthTokens';

export async function loadAuthTokens(): Promise<StoredAuthTokens | null> {
  const raw = await getSetting(TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthTokens;
  } catch {
    return null;
  }
}

export async function saveAuthTokens(tokens: StoredAuthTokens): Promise<void> {
  await setSetting(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearAuthTokens(): Promise<void> {
  await setSetting(TOKEN_KEY, '');
}

export function isAccessTokenValid(tokens: StoredAuthTokens | null): boolean {
  if (!tokens?.accessToken) {
    return false;
  }
  if (tokens.expiresAt === null) {
    return true;
  }
  return tokens.expiresAt > Date.now() + 30_000;
}

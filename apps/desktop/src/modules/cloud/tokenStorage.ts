import { readSecret, removeSecret, writeSecret } from '@/shared/lib/secureStorage';

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

/** Legacy SQLite settings key, only read to migrate old installs into the keychain. */
const LEGACY_TOKEN_KEY = 'cloudAuthTokens';
const SECRET_NAME = 'cloud.tokens';

export async function loadAuthTokens(): Promise<StoredAuthTokens | null> {
  const raw = await readSecret(SECRET_NAME, LEGACY_TOKEN_KEY);
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
  await writeSecret(SECRET_NAME, LEGACY_TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearAuthTokens(): Promise<void> {
  await removeSecret(SECRET_NAME, LEGACY_TOKEN_KEY);
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

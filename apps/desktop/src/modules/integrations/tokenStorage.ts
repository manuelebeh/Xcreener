import type { IntegrationProvider } from '@snapglow/integrations-core';
import { readSecret, writeSecret } from '@/shared/lib/secureStorage';

export interface StoredIntegrationToken {
  accessToken: string;
  expiresAt?: string | null;
  accountLabel?: string;
  metadata?: Record<string, string>;
}

/** Legacy SQLite settings key, only read to migrate old installs into the keychain. */
const LEGACY_TOKEN_KEY = 'integrationTokens';
const SECRET_NAME = 'integrations.tokens';

type TokenMap = Partial<Record<IntegrationProvider, StoredIntegrationToken>>;

export async function loadIntegrationTokens(): Promise<TokenMap> {
  const raw = await readSecret(SECRET_NAME, LEGACY_TOKEN_KEY);
  if (!raw) {
    return {};
  }

  let tokens: Partial<
    Record<IntegrationProvider, StoredIntegrationToken & { refreshToken?: unknown }>
  >;
  try {
    tokens = JSON.parse(raw);
  } catch {
    return {};
  }

  // Older versions also kept the provider refresh token, which nothing on desktop uses.
  const entries = Object.values(tokens);
  if (entries.some((token) => token && 'refreshToken' in token)) {
    for (const token of entries) {
      delete token?.refreshToken;
    }
    await writeSecret(SECRET_NAME, LEGACY_TOKEN_KEY, JSON.stringify(tokens));
  }
  return tokens;
}

export async function saveIntegrationToken(
  provider: IntegrationProvider,
  token: StoredIntegrationToken
): Promise<void> {
  const current = await loadIntegrationTokens();
  current[provider] = token;
  await writeSecret(SECRET_NAME, LEGACY_TOKEN_KEY, JSON.stringify(current));
}

export async function clearIntegrationToken(provider: IntegrationProvider): Promise<void> {
  const current = await loadIntegrationTokens();
  delete current[provider];
  await writeSecret(SECRET_NAME, LEGACY_TOKEN_KEY, JSON.stringify(current));
}

export async function getIntegrationToken(
  provider: IntegrationProvider
): Promise<StoredIntegrationToken | null> {
  const tokens = await loadIntegrationTokens();
  return tokens[provider] ?? null;
}

export function isIntegrationTokenValid(token: StoredIntegrationToken | null): boolean {
  if (!token?.accessToken) {
    return false;
  }
  if (!token.expiresAt) {
    return true;
  }
  return new Date(token.expiresAt).getTime() > Date.now() + 30_000;
}

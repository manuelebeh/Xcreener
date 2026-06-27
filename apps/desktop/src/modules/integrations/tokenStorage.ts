import { getSetting, setSetting } from '@/db';
import type { IntegrationProvider } from '@snapglow/integrations-core';

export interface StoredIntegrationToken {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  accountLabel?: string;
  metadata?: Record<string, string>;
}

const TOKEN_KEY = 'integrationTokens';

type TokenMap = Partial<Record<IntegrationProvider, StoredIntegrationToken>>;

export async function loadIntegrationTokens(): Promise<TokenMap> {
  const raw = await getSetting(TOKEN_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as TokenMap;
  } catch {
    return {};
  }
}

export async function saveIntegrationToken(
  provider: IntegrationProvider,
  token: StoredIntegrationToken
): Promise<void> {
  const current = await loadIntegrationTokens();
  current[provider] = token;
  await setSetting(TOKEN_KEY, JSON.stringify(current));
}

export async function clearIntegrationToken(provider: IntegrationProvider): Promise<void> {
  const current = await loadIntegrationTokens();
  delete current[provider];
  await setSetting(TOKEN_KEY, JSON.stringify(current));
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

import type { IntegrationProvider } from '@xcreener/integrations-core';
import { INTEGRATION_LABELS, INTEGRATION_PROVIDERS } from '@xcreener/integrations-core';
import { create } from 'zustand';
import { isCloudConfigured } from '@/modules/cloud/config';
import { handleIntegrationCallback, refreshIntegrationToken, startIntegrationLogin } from './auth';
import { isIntegrationsConfigured } from './config';
import {
  clearIntegrationToken,
  getIntegrationToken,
  isIntegrationTokenValid,
  loadIntegrationTokens,
  type StoredIntegrationToken,
} from './tokenStorage';

export interface IntegrationConnectionState {
  provider: IntegrationProvider;
  connected: boolean;
  accountLabel: string | null;
}

interface IntegrationsState {
  configured: boolean;
  connections: IntegrationConnectionState[];
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  connect: (provider: IntegrationProvider) => Promise<void>;
  disconnect: (provider: IntegrationProvider) => Promise<void>;
  setError: (error: string | null) => void;
}

function toConnectionState(
  provider: IntegrationProvider,
  token: StoredIntegrationToken | null
): IntegrationConnectionState {
  const connected = isIntegrationTokenValid(token) || Boolean(token?.refreshHandle);
  return {
    provider,
    connected,
    accountLabel: connected ? (token?.accountLabel ?? INTEGRATION_LABELS[provider]) : null,
  };
}

export const useIntegrationsStore = create<IntegrationsState>((set) => ({
  configured: isIntegrationsConfigured() && isCloudConfigured(),
  connections: [],
  isLoading: false,
  error: null,
  hydrate: async () => {
    if (!isIntegrationsConfigured() || !isCloudConfigured()) {
      set({ configured: false, connections: [] });
      return;
    }

    const tokens = await loadIntegrationTokens();
    const providers: IntegrationProvider[] = [
      'slack',
      'notion',
      'linear',
      'github',
      'jira',
      'confluence',
      'msteams',
    ];
    set({
      configured: true,
      connections: providers.map((provider) =>
        toConnectionState(provider, tokens[provider] ?? null)
      ),
      error: null,
    });
  },
  connect: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      await startIntegrationLogin(provider);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  },
  disconnect: async (provider) => {
    await clearIntegrationToken(provider);
    await useIntegrationsStore.getState().hydrate();
  },
  setError: (error) => set({ error }),
}));

export async function completeIntegrationAuthFromUrl(url: string): Promise<void> {
  await handleIntegrationCallback(url);
  await useIntegrationsStore.getState().hydrate();
  useIntegrationsStore.setState({ isLoading: false });
}

export function integrationLabel(provider: IntegrationProvider): string {
  return INTEGRATION_LABELS[provider];
}

export const ALL_INTEGRATION_PROVIDERS = INTEGRATION_PROVIDERS;

export async function requireIntegrationToken(
  provider: IntegrationProvider
): Promise<StoredIntegrationToken> {
  const token = await getIntegrationToken(provider);
  if (token && isIntegrationTokenValid(token)) {
    return token;
  }
  const refreshed = token?.refreshHandle ? await refreshIntegrationToken(provider, token) : null;
  if (!refreshed) {
    throw new Error(`Connect ${INTEGRATION_LABELS[provider]} in Settings first`);
  }
  return refreshed;
}

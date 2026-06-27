import { useEffect } from 'react';
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { completeCloudAuthFromUrl, useCloudAuthStore } from '@/modules/cloud/store';
import { isCloudConfigured } from '@/modules/cloud/config';
import { flushPendingTeamInvite, handleTeamInviteUrl } from '@/modules/team/auth-invite';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { isIntegrationsConfigured } from '../config';
import { completeIntegrationAuthFromUrl, useIntegrationsStore } from '../store';

export function useIntegrationsListener() {
  const hydrateIntegrations = useIntegrationsStore((state) => state.hydrate);
  const hydrateCloud = useCloudAuthStore((state) => state.hydrate);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    if (isCloudConfigured()) {
      void hydrateCloud();
    }

    if (isIntegrationsConfigured() && isCloudConfigured()) {
      void hydrateIntegrations();
    }

    let unlisten: (() => void) | undefined;

    void (async () => {
      const current = await getCurrent();
      for (const url of current ?? []) {
        await handleDeepLink(url);
      }

      unlisten = await onOpenUrl(async (urls) => {
        for (const url of urls) {
          await handleDeepLink(url);
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [hydrateCloud, hydrateIntegrations]);
}

async function handleDeepLink(url: string): Promise<void> {
  try {
    if (await handleTeamInviteUrl(url)) {
      return;
    }

    if (url.includes('auth/callback')) {
      await completeCloudAuthFromUrl(url);
      await flushPendingTeamInvite();
      return;
    }

    if (url.includes('integrations/callback')) {
      await completeIntegrationAuthFromUrl(url);
    }
  } catch (error) {
    useIntegrationsStore
      .getState()
      .setError(error instanceof Error ? error.message : String(error));
    useIntegrationsStore.setState({ isLoading: false });
  }
}

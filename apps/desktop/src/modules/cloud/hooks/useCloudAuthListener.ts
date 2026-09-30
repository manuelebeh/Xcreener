import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useEffect } from 'react';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { isCloudConfigured } from '../config';
import { completeCloudAuthFromUrl, useCloudAuthStore } from '../store';

export function useCloudAuthListener() {
  const hydrate = useCloudAuthStore((state) => state.hydrate);

  useEffect(() => {
    if (!isTauriRuntime() || !isCloudConfigured()) {
      return;
    }

    void hydrate();

    let unlisten: (() => void) | undefined;

    void (async () => {
      const current = await getCurrent();
      for (const url of current ?? []) {
        try {
          await completeCloudAuthFromUrl(url);
        } catch (error) {
          useCloudAuthStore
            .getState()
            .setError(error instanceof Error ? error.message : String(error));
          useCloudAuthStore.setState({ isLoading: false });
        }
      }

      unlisten = await onOpenUrl(async (urls) => {
        for (const url of urls) {
          try {
            await completeCloudAuthFromUrl(url);
          } catch (error) {
            useCloudAuthStore
              .getState()
              .setError(error instanceof Error ? error.message : String(error));
            useCloudAuthStore.setState({ isLoading: false });
          }
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, [hydrate]);
}

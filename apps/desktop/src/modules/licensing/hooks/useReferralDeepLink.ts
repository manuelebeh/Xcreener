import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useEffect } from 'react';
import { setSetting } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { SETTING_KEYS } from '@/shared/types/settings';

function parseReferralCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'snapglow:') {
      return null;
    }
    if (parsed.hostname !== 'ref') {
      return null;
    }
    const code = parsed.pathname.replace(/^\/+/, '').trim();
    return code || null;
  } catch {
    return null;
  }
}

async function applyReferralCode(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) {
    return;
  }
  useSettingsStore.getState().setPartnerCode(trimmed);
  await setSetting(SETTING_KEYS.partnerCode, trimmed);
}

export function useReferralDeepLink() {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | undefined;

    void (async () => {
      const current = await getCurrent();
      for (const url of current ?? []) {
        const code = parseReferralCode(url);
        if (code) {
          await applyReferralCode(code);
        }
      }

      unlisten = await onOpenUrl(async (urls) => {
        for (const url of urls) {
          const code = parseReferralCode(url);
          if (code) {
            await applyReferralCode(code);
          }
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);
}

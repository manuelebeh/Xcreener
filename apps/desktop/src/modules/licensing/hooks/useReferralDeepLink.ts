import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useEffect } from 'react';
import { setSetting } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';
import { deepLinkRoute } from '@/shared/lib/deepLink';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { SETTING_KEYS } from '@/shared/types/settings';

const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function parseReferralCode(url: string): string | null {
  try {
    const route = deepLinkRoute(new URL(url));
    const code = route?.startsWith('ref/') ? route.slice('ref/'.length) : null;
    return code && REFERRAL_CODE_PATTERN.test(code) ? code : null;
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

import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { captureUpdateChecked } from '@/integrations/posthog/events';
import { useSettingsStore } from '@/modules/settings/store';
import { isTauriRuntime } from '@/shared/lib/tauri';

export type UpdateCheckResult =
  | { status: 'unavailable' }
  | { status: 'current'; version: string }
  | { status: 'available'; version: string }
  | { status: 'error'; message: string };

export async function checkForAppUpdate(options?: {
  install?: boolean;
  silent?: boolean;
}): Promise<UpdateCheckResult> {
  if (!isTauriRuntime()) {
    return { status: 'unavailable' };
  }

  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;

  try {
    const update = await check();

    if (!update) {
      if (!options?.silent) {
        captureUpdateChecked(analyticsEnabled, { result: 'current' });
      }
      return { status: 'current', version: 'unknown' };
    }

    if (!options?.silent) {
      captureUpdateChecked(analyticsEnabled, {
        result: 'available',
        version: update.version,
      });
    }

    if (options?.install) {
      await update.downloadAndInstall();
      await relaunch();
    }

    return { status: 'available', version: update.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update check failed';
    if (!options?.silent) {
      captureUpdateChecked(analyticsEnabled, { result: 'error', message });
    }
    return { status: 'error', message };
  }
}

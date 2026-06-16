import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { isTauriRuntime } from '@/shared/lib/tauri';

export async function syncAutostart(enabled: boolean): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  const currentlyEnabled = await isEnabled();

  if (enabled && !currentlyEnabled) {
    await enable();
    return;
  }

  if (!enabled && currentlyEnabled) {
    await disable();
  }
}

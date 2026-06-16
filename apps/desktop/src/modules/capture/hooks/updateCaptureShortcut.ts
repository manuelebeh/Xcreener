import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '@/shared/lib/tauri';

export async function updateCaptureShortcut(shortcut: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke('update_capture_shortcut', { shortcut });
}

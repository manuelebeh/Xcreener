import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { useCapture } from './useCapture';

interface CaptureTriggeredPayload {
  source: string;
}

export function useGlobalShortcut() {
  const { startCapture, stopCapture } = useCapture();
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    listen<CaptureTriggeredPayload>('capture-triggered', (event) => {
      if (import.meta.env.DEV) {
        console.info('[SnapGlow] capture-triggered', event.payload);
      }
      startCapture();
      setLastTriggeredAt(Date.now());
      window.setTimeout(() => stopCapture(), 600);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [startCapture, stopCapture]);

  return { lastTriggeredAt };
}

export async function updateCaptureShortcut(shortcut: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }
  await invoke('update_capture_shortcut', { shortcut });
}

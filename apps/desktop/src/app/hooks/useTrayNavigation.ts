import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCaptures } from '@/db/captures';
import { useOpenCapture } from '@/modules/history';
import { isTauriRuntime } from '@/shared/lib/tauri';

export function useTrayNavigation() {
  const navigate = useNavigate();
  const { openCapture } = useOpenCapture();

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;
    const unlisteners: (() => void)[] = [];

    const handlers: Record<string, () => void> = {
      'navigate-settings': () => navigate('/settings'),
      'navigate-history': () => navigate('/history'),
      'open-latest-capture': () => {
        listCaptures(1)
          .then(([latest]) => (latest ? openCapture(latest.id) : navigate('/history')))
          .catch((error) => console.error('[SnapGlow] Failed to reopen last capture', error));
      },
    };

    for (const [event, handler] of Object.entries(handlers)) {
      listen(event, handler).then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisteners.push(fn);
        }
      });
    }

    return () => {
      cancelled = true;
      for (const fn of unlisteners) {
        fn();
      }
    };
  }, [navigate, openCapture]);
}

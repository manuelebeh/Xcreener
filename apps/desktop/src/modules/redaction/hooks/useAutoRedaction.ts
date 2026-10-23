import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useSettingsStore } from '@/modules/settings/store';
import { useRedactionStore } from '../store';
import { useRedactionScan } from './useRedactionScan';

export function useAutoRedaction(): void {
  const autoRedaction = useSettingsStore((s) => s.autoRedaction);
  const screenshot = useEditorStore((s) => s.screenshot);
  // Balance/Inset swap the bitmap without a new capture: masks already follow, so only rescan new captures.
  const captureId = useEditorStore((s) => (s.screenshot ? s.captureId : null));
  const { scan, maskAll } = useRedactionScan();
  const pendingRef = useRef(false);
  const lastScreenshotRef = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    if (screenshot !== lastScreenshotRef.current) {
      lastScreenshotRef.current = screenshot;
      useRedactionStore.getState().clear();
      pendingRef.current = false;
    }
  }, [screenshot]);

  useEffect(() => {
    if (!autoRedaction || captureId === null || pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    void (async () => {
      try {
        await scan();
        maskAll(true);
      } finally {
        pendingRef.current = false;
      }
    })();
  }, [autoRedaction, captureId, maskAll, scan]);
}

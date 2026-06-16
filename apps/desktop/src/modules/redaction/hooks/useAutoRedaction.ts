import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useSettingsStore } from '@/modules/settings/store';
import { useRedactionStore } from '../store';
import { useRedactionScan } from './useRedactionScan';

export function useAutoRedaction(): void {
  const autoRedaction = useSettingsStore((s) => s.autoRedaction);
  const screenshot = useEditorStore((s) => s.screenshot);
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
    if (!autoRedaction || !screenshot || pendingRef.current) {
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
  }, [autoRedaction, maskAll, scan, screenshot]);
}

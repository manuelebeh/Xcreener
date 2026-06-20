import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useSettingsStore } from '@/modules/settings/store';
import { useStyleSuggestionStore } from '../store';
import { useStyleSuggestionScan } from './useStyleSuggestion';

export function useAutoStyleSuggestion(): void {
  const autoStyleSuggestion = useSettingsStore((s) => s.autoStyleSuggestion);
  const screenshot = useEditorStore((s) => s.screenshot);
  const { scan } = useStyleSuggestionScan();
  const pendingRef = useRef(false);
  const lastScreenshotRef = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    if (screenshot !== lastScreenshotRef.current) {
      lastScreenshotRef.current = screenshot;
      useStyleSuggestionStore.getState().clear();
      pendingRef.current = false;
    }
  }, [screenshot]);

  useEffect(() => {
    if (!autoStyleSuggestion || !screenshot || pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    void (async () => {
      try {
        await scan();
      } finally {
        pendingRef.current = false;
      }
    })();
  }, [autoStyleSuggestion, scan, screenshot]);
}

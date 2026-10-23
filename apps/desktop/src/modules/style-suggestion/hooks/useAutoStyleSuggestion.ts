import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useSettingsStore } from '@/modules/settings/store';
import { useStyleSuggestionStore } from '../store';
import { useStyleSuggestionScan } from './useStyleSuggestion';

export function useAutoStyleSuggestion(): void {
  const autoStyleSuggestion = useSettingsStore((s) => s.autoStyleSuggestion);
  // Keyed on the capture, not the bitmap: Balance/Inset swaps should not reset the suggestion.
  const captureId = useEditorStore((s) => (s.screenshot ? s.captureId : null));
  const { scan } = useStyleSuggestionScan();
  const pendingRef = useRef(false);
  const lastCaptureRef = useRef<number | null>(null);

  useEffect(() => {
    if (captureId !== lastCaptureRef.current) {
      lastCaptureRef.current = captureId;
      useStyleSuggestionStore.getState().clear();
      pendingRef.current = false;
    }
  }, [captureId]);

  useEffect(() => {
    if (!autoStyleSuggestion || captureId === null || pendingRef.current) {
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
  }, [autoStyleSuggestion, captureId, scan]);
}

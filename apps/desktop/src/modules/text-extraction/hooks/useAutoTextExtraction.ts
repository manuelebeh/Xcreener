import { useEffect } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useTextExtractionStore } from '../store';
import { useTextExtraction } from './useTextExtraction';

/** Reads the text of every capture on-device, and again when Balance swaps the bitmap. */
export function useAutoTextExtraction(): void {
  const screenshot = useEditorStore((s) => s.screenshot);
  const { scan } = useTextExtraction();

  useEffect(() => {
    if (!screenshot) {
      useTextExtractionStore.getState().clear();
      return;
    }
    void scan();
  }, [scan, screenshot]);
}

import { lineId } from '@snapglow/ocr-core';
import { useCallback } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { screenshotToPngBytes } from '@/modules/redaction/utils/screenshotToPngBytes';
import { useSettingsStore } from '@/modules/settings/store';
import { recognizeText } from '@/tauri/commands';
import { useTextExtractionStore } from '../store';

export function useTextExtraction() {
  const scan = useCallback(async () => {
    const screenshot = useEditorStore.getState().screenshot;
    if (!screenshot) {
      return;
    }

    const { clear, setStatus, setLines, setError, setSelectionEnabled } =
      useTextExtractionStore.getState();
    const { ocrEngine, ocrLanguages } = useSettingsStore.getState();

    clear();
    setStatus('scanning');
    setSelectionEnabled(true);

    try {
      const bytes = await screenshotToPngBytes(screenshot);
      const lines = await recognizeText(bytes, {
        engine: ocrEngine,
        languages: ocrLanguages
          .split('+')
          .map((language) => language.trim())
          .filter(Boolean),
      });
      setLines(lines);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, []);

  const toggleLine = useCallback((lineIdValue: string, range = false) => {
    useTextExtractionStore.getState().toggleLineSelection(lineIdValue, range);
  }, []);

  const getLineId = useCallback((line: Parameters<typeof lineId>[0]) => lineId(line), []);

  return { scan, toggleLine, getLineId };
}

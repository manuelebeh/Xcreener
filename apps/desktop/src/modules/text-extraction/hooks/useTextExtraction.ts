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

    const { clear, setStatus, setLines, setError } = useTextExtractionStore.getState();
    const { ocrEngine, ocrLanguages } = useSettingsStore.getState();

    clear();
    setStatus('scanning');

    try {
      const bytes = await screenshotToPngBytes(screenshot);
      const lines = await recognizeText(bytes, {
        engine: ocrEngine,
        languages: ocrLanguages
          .split('+')
          .map((language) => language.trim())
          .filter(Boolean),
      });
      // A new capture or a Balance swap replaced the bitmap: these lines no longer line up.
      if (useEditorStore.getState().screenshot !== screenshot) {
        return;
      }
      setLines(lines);
    } catch (error) {
      if (useEditorStore.getState().screenshot !== screenshot) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, []);

  return { scan };
}

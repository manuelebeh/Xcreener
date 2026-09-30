import {
  MIN_CLASSIFICATION_CONFIDENCE,
  mapContentClassToStyle,
} from '@snapglow/style-suggestion-core';
import { useCallback } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { screenshotToPngBytes } from '@/modules/redaction/utils/screenshotToPngBytes';
import { classifyContent } from '@/tauri/commands';
import { useStyleSuggestionStore } from '../store';
import { applySuggestedStyle } from '../utils/applySuggestedStyle';

export function useApplySuggestedStyle() {
  return useCallback(async () => {
    const { suggestion } = useStyleSuggestionStore.getState();
    if (!suggestion) {
      return;
    }

    await applySuggestedStyle(suggestion);
    useStyleSuggestionStore.getState().dismiss();
  }, []);
}

export function useStyleSuggestionScan() {
  const scan = useCallback(async () => {
    const screenshot = useEditorStore.getState().screenshot;
    if (!screenshot) {
      return;
    }

    const { setClassifying, setReady, setError } = useStyleSuggestionStore.getState();
    setClassifying();

    try {
      const bytes = await screenshotToPngBytes(screenshot);
      const result = await classifyContent(bytes);

      if (result.confidence < MIN_CLASSIFICATION_CONFIDENCE) {
        setError('Confidence too low for a style suggestion');
        return;
      }

      const suggestion = mapContentClassToStyle(result.class);
      setReady(result.class, suggestion, result.confidence);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, []);

  return { scan };
}

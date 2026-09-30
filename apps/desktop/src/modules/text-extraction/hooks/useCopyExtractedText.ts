import { linesToPlainText, mergeSelectedLines } from '@snapglow/ocr-core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { useCallback } from 'react';
import { useTextExtractionStore } from '../store';

export function useCopyExtractedText() {
  const copyAll = useCallback(async () => {
    const { lines, setLastCopiedText } = useTextExtractionStore.getState();
    const text = linesToPlainText(lines);
    if (!text) {
      return false;
    }

    await writeText(text);
    setLastCopiedText(text);
    return true;
  }, []);

  const copySelected = useCallback(async () => {
    const { lines, selectedLineIds, setLastCopiedText } = useTextExtractionStore.getState();
    const text =
      selectedLineIds.length > 0
        ? mergeSelectedLines(lines, selectedLineIds)
        : linesToPlainText(lines);

    if (!text) {
      return false;
    }

    await writeText(text);
    setLastCopiedText(text);
    return true;
  }, []);

  return { copyAll, copySelected };
}

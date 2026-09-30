import { useCallback } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { screenshotToPngBytes } from '@/modules/redaction/utils/screenshotToPngBytes';
import { decodePngBytesToBitmap } from '@/shared/utils/image';
import { cropImage, detectContentBounds } from '@/tauri/commands';
import { useAutoCropStore } from '../store';

export function useAutoCrop() {
  const runAutoCrop = useCallback(async () => {
    const screenshot = useEditorStore.getState().screenshot;
    if (!screenshot) {
      return;
    }

    const { clear, setStatus, setError, setLastReductionPercent } = useAutoCropStore.getState();
    clear();
    setStatus('running');

    try {
      const originalArea = screenshot.width * screenshot.height;
      const bytes = await screenshotToPngBytes(screenshot);
      const bounds = await detectContentBounds(bytes);
      const croppedBytes = await cropImage(bytes, bounds);
      const croppedBitmap = await decodePngBytesToBitmap(croppedBytes);

      const editor = useEditorStore.getState();
      editor.pushHistory();
      editor.cropScreenshot(croppedBitmap);

      const croppedArea = croppedBitmap.width * croppedBitmap.height;
      const reduction = Math.max(0, 1 - croppedArea / originalArea);
      setLastReductionPercent(Math.round(reduction * 100));
      setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, []);

  return { runAutoCrop };
}

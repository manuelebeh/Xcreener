import { useCallback } from 'react';
import { moveAnnotation } from '@/modules/editor/annotations/resize';
import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { screenshotToPngBytes } from '@/modules/redaction/utils/screenshotToPngBytes';
import { analyzeContent } from '@/tauri/commands';
import { useBalanceStore } from '../store';
import { annotationShift, cropBitmap, type PlacedBitmap, sourceRect } from '../utils/balance';

/** Drops results of a toggle that a newer toggle superseded. */
let latestApply = 0;

function placeOnCanvas(bitmap: ImageBitmap, origin: PlacedBitmap['origin']): PlacedBitmap {
  const editor = useEditorStore.getState();
  const layout = computeLayout({
    screenshot: bitmap,
    background: editor.background,
    padding: editor.padding,
    borderRadius: editor.borderRadius,
    shadow: editor.shadow,
    frame: getPresetById(editor.selectedPresetId, editor.customPresets),
    transform: editor.transform,
    annotations: [],
    selectedAnnotationId: null,
  });
  return { rect: layout.screenshot, width: bitmap.width, height: bitmap.height, origin };
}

export function useBalance() {
  /** Copies the capture and detects its content box and background color. */
  const prepare = useCallback(async (screenshot: ImageBitmap) => {
    const store = useBalanceStore;
    store.getState().reset(screenshot);
    store.setState({ status: 'analyzing' });

    let source: ImageBitmap | null = null;
    try {
      source = await createImageBitmap(screenshot);
      const analysis = await analyzeContent(await screenshotToPngBytes(source));
      if (store.getState().output !== screenshot) {
        source.close();
        return;
      }
      store.setState({ source, analysis, status: 'ready' });
    } catch (error) {
      source?.close();
      if (store.getState().output !== screenshot) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      store.setState({ status: 'error', error: message });
    }
  }, []);

  const apply = useCallback(async (balance: boolean) => {
    const store = useBalanceStore;
    const { source, analysis, status } = store.getState();
    if (status !== 'ready' || !source || !analysis) {
      return;
    }

    store.setState({ balance });
    const applyId = ++latestApply;

    const rect = sourceRect(analysis, source.width, source.height, balance);
    const bitmap = await cropBitmap(source, rect);

    const { output, origin } = store.getState();
    const editor = useEditorStore.getState();
    if (applyId !== latestApply || !output || editor.screenshot !== output) {
      bitmap.close();
      return;
    }

    const nextOrigin = { x: -rect.x, y: -rect.y };
    const { bounds } = analysis;
    const shift = annotationShift(
      placeOnCanvas(output, origin),
      placeOnCanvas(bitmap, nextOrigin),
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    );

    // Record the output first so BalanceBar does not mistake the swap for a new capture.
    store.setState({ output: bitmap, origin: nextOrigin });
    editor.replaceScreenshot(bitmap);
    if (shift.x !== 0 || shift.y !== 0) {
      editor.setAnnotations(
        editor.annotations.map((annotation) => moveAnnotation(annotation, shift.x, shift.y))
      );
    }
  }, []);

  return { prepare, apply };
}

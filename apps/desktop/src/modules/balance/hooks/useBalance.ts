import { useCallback } from 'react';
import { moveAnnotation } from '@/modules/editor/annotations/resize';
import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { screenshotToPngBytes } from '@/modules/redaction/utils/screenshotToPngBytes';
import { analyzeContent } from '@/tauri/commands';
import { type BalanceState, useBalanceStore } from '../store';
import {
  annotationShift,
  composeBitmap,
  cornerColor,
  type PlacedBitmap,
  rgbaToHex,
  sourceRect,
} from '../utils/balance';

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
  /**
   * Copies the capture, which is all the inset needs, then detects the content box and
   * background color for balance. Detection fails on busy backgrounds (web pages), so a
   * failure there only disables balance.
   */
  const prepare = useCallback(async (screenshot: ImageBitmap) => {
    const store = useBalanceStore;
    store.getState().reset(screenshot);
    store.setState({ status: 'analyzing' });
    const isStale = () => store.getState().output !== screenshot;

    let source: ImageBitmap | null = null;
    try {
      source = await createImageBitmap(screenshot);
      const insetColor = await cornerColor(source);
      if (isStale()) {
        source.close();
        return;
      }
      store.setState({ source, insetColor, status: 'ready' });
    } catch (error) {
      source?.close();
      if (!isStale()) {
        store.setState({
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    try {
      const analysis = await analyzeContent(await screenshotToPngBytes(source));
      if (isStale()) {
        return;
      }
      store.setState({
        analysis,
        ...(store.getState().inset === 0 && { insetColor: rgbaToHex(analysis.background) }),
      });
    } catch (error) {
      if (!isStale()) {
        store.setState({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  }, []);

  /** Redraws the capture from its source with the given balance, inset and inset color. */
  const update = useCallback(
    async (patch: Partial<Pick<BalanceState, 'balance' | 'inset' | 'insetColor'>>) => {
      const store = useBalanceStore;
      const { source, status } = store.getState();
      if (status !== 'ready' || !source) {
        return;
      }

      store.setState(patch);
      const { analysis, balance, inset, insetColor } = store.getState();
      const applyId = ++latestApply;

      const rect = analysis
        ? sourceRect(analysis, source.width, source.height, balance)
        : { x: 0, y: 0, width: source.width, height: source.height };
      const bitmap = await composeBitmap(source, rect, inset, insetColor);

      const { output, origin } = store.getState();
      const editor = useEditorStore.getState();
      if (applyId !== latestApply || !output || editor.screenshot !== output) {
        bitmap.close();
        return;
      }

      const nextOrigin = { x: inset - rect.x, y: inset - rect.y };
      const bounds = analysis?.bounds ?? { x: 0, y: 0, width: source.width, height: source.height };
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
    },
    []
  );

  return { prepare, update };
}

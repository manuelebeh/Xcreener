import { useCallback } from 'react';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import type { RenderInput } from '@/modules/editor/types';
import { exportRenderInput } from '../utils/canvasExport';
import type { ExportFormat } from '../utils/formats';

export function buildRenderInputFromStore(): RenderInput | null {
  const state = useEditorStore.getState();
  if (!state.screenshot) {
    return null;
  }

  const frame = getPresetById(state.selectedPresetId, state.customPresets);

  return {
    screenshot: state.screenshot,
    background: state.background,
    padding: state.padding,
    borderRadius: state.borderRadius,
    shadow: state.shadow,
    frame,
    transform: state.transform,
    annotations: state.annotations,
    selectedAnnotationId: null,
  };
}

export function useExportRender() {
  const exportImage = useCallback(async (format: ExportFormat, quality: number) => {
    const input = buildRenderInputFromStore();
    if (!input) {
      throw new Error('No screenshot to export');
    }

    const startedAt = performance.now();
    const result = await exportRenderInput(input, format, quality);
    const durationMs = Math.round(performance.now() - startedAt);

    return {
      ...result,
      durationMs,
      format,
      compressionPercent: result.compressionPercent,
    };
  }, []);

  return { exportImage, buildRenderInput: buildRenderInputFromStore };
}

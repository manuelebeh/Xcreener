import { useCallback } from 'react';
import { getPresetById } from '@/modules/editor/engine/presets';
import { loadWatermarkLogoImage, watermarkFromSettings } from '@/modules/settings/watermark';
import { useSettingsStore } from '@/modules/settings/store';
import { useEditorStore } from '@/modules/editor/store';
import type { RenderInput } from '@/modules/editor/types';
import { exportRenderInput } from '../utils/canvasExport';
import type { ExportFormat } from '../utils/formats';

export async function buildRenderInputFromStore(): Promise<RenderInput | null> {
  const state = useEditorStore.getState();
  if (!state.screenshot) {
    return null;
  }

  const frame = getPresetById(state.selectedPresetId, state.customPresets);
  const settings = useSettingsStore.getState();
  const watermark = watermarkFromSettings(settings);
  const watermarkLogo = watermark.enabled
    ? await loadWatermarkLogoImage(watermark.logoPath)
    : null;

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
    watermark,
    watermarkLogo,
  };
}

export function useExportRender() {
  const exportImage = useCallback(async (format: ExportFormat, quality: number) => {
    const input = await buildRenderInputFromStore();
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

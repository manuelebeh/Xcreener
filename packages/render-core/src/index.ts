import type { CollabDocumentState } from '@snapglow/collab-core';
import type { WatermarkConfig } from '@snapglow/editor-core';
import type { RenderInput, RenderScreenshotSource } from './types';

export function documentStateToRenderInput(
  documentState: CollabDocumentState,
  screenshot: RenderScreenshotSource,
  options?: {
    watermark?: WatermarkConfig;
    watermarkLogo?: CanvasImageSource | null;
  }
): RenderInput {
  return {
    screenshot,
    background:
      documentState.background.type === 'image'
        ? { type: 'image', source: null }
        : documentState.background,
    padding: documentState.padding,
    borderRadius: documentState.borderRadius,
    shadow: documentState.shadow,
    frame: documentState.frame,
    transform: documentState.transform,
    annotations: documentState.annotations,
    selectedAnnotationId: null,
    watermark: options?.watermark,
    watermarkLogo: options?.watermarkLogo,
  };
}

export { computeLayout } from './computeLayout';
export { drawAnnotations } from './drawAnnotations';
export { drawBackground } from './drawBackground';
export { drawBlurMasks } from './drawBlurMasks';
export { drawScreenshot } from './drawScreenshot';
export { drawShadow } from './drawShadow';
export { drawWatermark } from './drawWatermark';
export { type RenderResult, renderFrame } from './renderFrame';
export type { RenderBackgroundConfig, RenderInput, RenderScreenshotSource } from './types';
export { toCoreRenderInput } from './types';

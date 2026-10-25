import type { ComputedLayout } from '@xcreener/editor-core';
import { computeLayout } from './computeLayout';
import { drawAnnotations } from './drawAnnotations';
import { drawBackground } from './drawBackground';
import { drawBlurMasks } from './drawBlurMasks';
import { drawScreenshot } from './drawScreenshot';
import { drawSelectionHandles } from './drawSelectionHandles';
import { drawShadow } from './drawShadow';
import { drawWatermark } from './drawWatermark';
import type { RenderInput } from './types';

export interface RenderResult {
  layout: ComputedLayout;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  pixelRatio = 1,
  _canvas?: HTMLCanvasElement | OffscreenCanvas,
  watermarkLogo?: CanvasImageSource | null
): RenderResult {
  const layout = computeLayout(input);

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);

  drawBackground(ctx, input.background, layout.canvasWidth, layout.canvasHeight);

  const screenshotRect = {
    ...layout.screenshot,
  };

  drawShadow(ctx, screenshotRect, input.borderRadius, input.shadow);
  drawScreenshot(ctx, input.screenshot, screenshotRect, input.borderRadius);

  drawBlurMasks(ctx, input.annotations, layout.canvasWidth, layout.canvasHeight, pixelRatio);

  drawAnnotations(ctx, input.annotations);

  if (input.watermark) {
    drawWatermark(
      ctx,
      layout.canvasWidth,
      layout.canvasHeight,
      input.watermark,
      watermarkLogo ?? input.watermarkLogo
    );
  }

  if (input.selectedAnnotationId) {
    const selected = input.annotations.find(
      (annotation) => annotation.id === input.selectedAnnotationId
    );
    if (selected) {
      drawSelectionHandles(ctx, selected);
    }
  }

  return { layout };
}

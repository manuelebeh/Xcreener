import type { ComputedLayout, RenderInput } from '../types';
import { computeLayout } from './computeLayout';
import { drawBackground } from './drawBackground';
import { drawScreenshot } from './drawScreenshot';
import { drawShadow } from './drawShadow';

export interface RenderResult {
  layout: ComputedLayout;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  pixelRatio = 1
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

  return { layout };
}

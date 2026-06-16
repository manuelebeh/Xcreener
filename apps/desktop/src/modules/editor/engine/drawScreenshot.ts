import type { LayoutRect } from '../types';

function roundRectPath(ctx: CanvasRenderingContext2D, rect: LayoutRect, radius: number): void {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
}

export function drawScreenshot(
  ctx: CanvasRenderingContext2D,
  screenshot: ImageBitmap,
  rect: LayoutRect,
  borderRadius: number
): void {
  ctx.save();
  roundRectPath(ctx, rect, borderRadius);
  ctx.clip();
  ctx.drawImage(
    screenshot,
    0,
    0,
    screenshot.width,
    screenshot.height,
    rect.x,
    rect.y,
    rect.width,
    rect.height
  );
  ctx.restore();
}

import type { LayoutRect, ShadowConfig } from '@snapglow/editor-core';

function roundRectPath(ctx: CanvasRenderingContext2D, rect: LayoutRect, radius: number): void {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  rect: LayoutRect,
  borderRadius: number,
  shadow: ShadowConfig
): void {
  if (shadow.opacity <= 0 || shadow.blur <= 0) {
    return;
  }

  ctx.save();
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;
  ctx.globalAlpha = shadow.opacity;
  ctx.fillStyle = '#000000';

  roundRectPath(ctx, rect, borderRadius);
  ctx.fill();
  ctx.restore();
}

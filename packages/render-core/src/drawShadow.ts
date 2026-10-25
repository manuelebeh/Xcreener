import type { LayoutRect, ShadowConfig } from '@xcreener/editor-core';

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

  // Shadow blur and offsets ignore the transform, so scale them to match the layout.
  const scale = ctx.getTransform().a;
  const r = Math.min(borderRadius, rect.width / 2, rect.height / 2);

  ctx.save();
  // Clip out the screenshot area: the fill that casts the shadow must not show
  // through transparent pixels (rounded window corners).
  ctx.beginPath();
  ctx.rect(-1e5, -1e5, 2e5, 2e5);
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
  ctx.clip('evenodd');

  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur * scale;
  ctx.shadowOffsetX = shadow.offsetX * scale;
  ctx.shadowOffsetY = shadow.offsetY * scale;
  ctx.globalAlpha = shadow.opacity;
  ctx.fillStyle = '#000000';

  roundRectPath(ctx, rect, borderRadius);
  ctx.fill();
  ctx.restore();
}

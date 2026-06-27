import type { WatermarkConfig, WatermarkPosition } from '@snapglow/editor-core';

const WATERMARK_PADDING = 16;
const WATERMARK_FONT = '600 14px "IBM Plex Sans", system-ui, sans-serif';

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  config: WatermarkConfig,
  logoImage?: CanvasImageSource | null
): void {
  if (!config.enabled) {
    return;
  }

  const label = [config.displayName, config.url].filter(Boolean).join(' · ');
  const logo = logoImage ?? null;

  if (!label && !logo) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, config.opacity / 100));

  const logoSize = logo ? 28 : 0;
  ctx.font = WATERMARK_FONT;
  const textWidth = label ? ctx.measureText(label).width : 0;
  const blockWidth = logoSize + (logo && label ? 8 : 0) + textWidth + WATERMARK_PADDING * 2;
  const blockHeight = Math.max(logoSize, 18) + WATERMARK_PADDING * 2;

  const { x, y } = positionOrigin(config.position, canvasWidth, canvasHeight, blockWidth, blockHeight);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(x, y, blockWidth, blockHeight, 8);
  ctx.fill();

  let cursorX = x + WATERMARK_PADDING;
  const centerY = y + blockHeight / 2;

  if (logo) {
    const logoY = centerY - logoSize / 2;
    ctx.drawImage(logo, cursorX, logoY, logoSize, logoSize);
    cursorX += logoSize + 8;
  }

  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cursorX, centerY);
  }

  ctx.restore();
}

function positionOrigin(
  position: WatermarkPosition,
  canvasWidth: number,
  canvasHeight: number,
  blockWidth: number,
  blockHeight: number
): { x: number; y: number } {
  switch (position) {
    case 'top-left':
      return { x: WATERMARK_PADDING, y: WATERMARK_PADDING };
    case 'top-right':
      return { x: canvasWidth - blockWidth - WATERMARK_PADDING, y: WATERMARK_PADDING };
    case 'bottom-left':
      return { x: WATERMARK_PADDING, y: canvasHeight - blockHeight - WATERMARK_PADDING };
    case 'bottom-right':
      return {
        x: canvasWidth - blockWidth - WATERMARK_PADDING,
        y: canvasHeight - blockHeight - WATERMARK_PADDING,
      };
  }
}

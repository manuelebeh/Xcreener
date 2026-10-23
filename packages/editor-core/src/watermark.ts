import type { WatermarkConfig } from './types';

/** Same metrics as render-core `drawWatermark`, so every surface draws the same badge. */
export const WATERMARK_PADDING = 16;
export const WATERMARK_FONT_SIZE = 14;
const LOGO_SIZE = 28;
const LOGO_GAP = 8;
const MIN_CONTENT_HEIGHT = 18;

export interface WatermarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Left edge of the label. */
  textX: number;
  centerY: number;
}

export function watermarkLabel(config: WatermarkConfig): string {
  return [config.displayName, config.url].filter(Boolean).join(' · ');
}

export function computeWatermarkBox(
  config: WatermarkConfig,
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
  hasLogo: boolean
): WatermarkBox {
  const logoSize = hasLogo ? LOGO_SIZE : 0;
  const logoGap = hasLogo && textWidth > 0 ? LOGO_GAP : 0;
  const width = logoSize + logoGap + textWidth + WATERMARK_PADDING * 2;
  const height = Math.max(logoSize, MIN_CONTENT_HEIGHT) + WATERMARK_PADDING * 2;

  const left = config.position.endsWith('left');
  const top = config.position.startsWith('top');
  const x = left ? WATERMARK_PADDING : canvasWidth - width - WATERMARK_PADDING;
  const y = top ? WATERMARK_PADDING : canvasHeight - height - WATERMARK_PADDING;

  return {
    x,
    y,
    width,
    height,
    textX: x + WATERMARK_PADDING + (hasLogo ? logoSize + LOGO_GAP : 0),
    centerY: y + height / 2,
  };
}

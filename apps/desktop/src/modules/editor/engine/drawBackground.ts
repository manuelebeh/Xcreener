import type { BackgroundConfig } from '../types';
import { getGradientPreset } from './gradients';

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  width: number,
  height: number
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawLinearGradientBackground(
  ctx: CanvasRenderingContext2D,
  presetId: string,
  width: number,
  height: number
): void {
  const preset = getGradientPreset(presetId);
  const radians = (preset.angle * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const length = Math.sqrt(width * width + height * height) / 2;
  const x0 = halfWidth - Math.cos(radians) * length;
  const y0 = halfHeight - Math.sin(radians) * length;
  const x1 = halfWidth + Math.cos(radians) * length;
  const y1 = halfHeight + Math.sin(radians) * length;

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const stop of preset.stops) {
    gradient.addColorStop(stop.offset, stop.color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: BackgroundConfig,
  width: number,
  height: number
): void {
  switch (background.type) {
    case 'gradient':
      drawLinearGradientBackground(ctx, background.presetId, width, height);
      break;
    case 'solid':
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, width, height);
      break;
    case 'image':
      if (background.source) {
        drawCoverImage(ctx, background.source, width, height);
      } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
      }
      break;
  }
}

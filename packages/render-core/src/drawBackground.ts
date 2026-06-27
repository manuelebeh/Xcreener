import { getGradientPreset } from '@snapglow/editor-core';
import type { RenderBackgroundConfig } from './types';

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number
): void {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
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
  background: RenderBackgroundConfig,
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
        const size = readImageSize(background.source);
        if (size) {
          drawCoverImage(ctx, background.source, size.width, size.height, width, height);
        } else {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, width, height);
        }
      } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);
      }
      break;
  }
}

function readImageSize(source: CanvasImageSource): { width: number; height: number } | null {
  if ('width' in source && 'height' in source) {
    const width = source.width;
    const height = source.height;
    if (typeof width === 'number' && typeof height === 'number') {
      return { width, height };
    }
  }
  return null;
}

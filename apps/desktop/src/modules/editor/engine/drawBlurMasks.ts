import type { Annotation, BlurAnnotation } from '../annotations/types';
import {
  clampBlurRect,
  gaussianBlurImageData,
  pixelateImageData,
} from '@snapglow/editor-core';

function getBlurDeviceRect(
  rect: { x: number; y: number; width: number; height: number },
  pixelRatio: number
): { sx: number; sy: number; sw: number; sh: number } {
  return {
    sx: Math.floor(rect.x * pixelRatio),
    sy: Math.floor(rect.y * pixelRatio),
    sw: Math.max(1, Math.ceil(rect.width * pixelRatio)),
    sh: Math.max(1, Math.ceil(rect.height * pixelRatio)),
  };
}

function applyGaussianBlur(
  ctx: CanvasRenderingContext2D,
  annotation: BlurAnnotation,
  rect: { x: number; y: number; width: number; height: number },
  pixelRatio: number
): void {
  const { sx, sy, sw, sh } = getBlurDeviceRect(rect, pixelRatio);
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const radius = Math.max(1, Math.round(annotation.intensity * pixelRatio * 0.45));
  gaussianBlurImageData(imageData, radius);
  ctx.putImageData(imageData, sx, sy);
}

function applyPixelateBlur(
  ctx: CanvasRenderingContext2D,
  annotation: BlurAnnotation,
  rect: { x: number; y: number; width: number; height: number },
  pixelRatio: number
): void {
  const { sx, sy, sw, sh } = getBlurDeviceRect(rect, pixelRatio);
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  pixelateImageData(imageData, annotation.intensity);
  ctx.putImageData(imageData, sx, sy);
}

export function drawBlurMasks(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  canvasWidth: number,
  canvasHeight: number,
  pixelRatio = 1
): void {
  const blurAnnotations = annotations.filter(
    (annotation): annotation is BlurAnnotation => annotation.type === 'blur'
  );

  for (const annotation of blurAnnotations) {
    const rect = clampBlurRect(
      annotation.x,
      annotation.y,
      annotation.width,
      annotation.height,
      canvasWidth,
      canvasHeight
    );

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    if (annotation.mode === 'gaussian') {
      applyGaussianBlur(ctx, annotation, rect, pixelRatio);
    } else {
      applyPixelateBlur(ctx, annotation, rect, pixelRatio);
    }
  }
}

// Re-export for tests
export { gaussianBlurImageData, pixelateImageData } from '@snapglow/editor-core';

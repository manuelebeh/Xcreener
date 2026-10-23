import type { LayoutRect } from '@/modules/editor/types';
import { createExportCanvas } from '@/modules/export/utils/canvasExport';
import type { ContentAnalysis } from '@/shared/types/ipc';

export interface Point {
  x: number;
  y: number;
}

/**
 * Area of the capture to keep. With balance on, every side gets the smallest
 * existing margin, so the content ends up centered.
 */
export function sourceRect(
  analysis: ContentAnalysis,
  width: number,
  height: number,
  balance: boolean
): LayoutRect {
  if (!balance) {
    return { x: 0, y: 0, width, height };
  }

  const { bounds } = analysis;
  const margin = Math.min(
    bounds.x,
    bounds.y,
    width - bounds.x - bounds.width,
    height - bounds.y - bounds.height
  );

  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
  };
}

export function cropBitmap(source: ImageBitmap, rect: LayoutRect): Promise<ImageBitmap> {
  const canvas = createExportCanvas(rect.width, rect.height);
  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    throw new Error('Failed to create balance canvas context');
  }

  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return createImageBitmap(canvas);
}

export interface PlacedBitmap {
  /** Where the bitmap is drawn on the canvas. */
  rect: LayoutRect;
  width: number;
  height: number;
  /** Position of the source's (0, 0) inside the bitmap. */
  origin: Point;
}

/** Canvas offset that keeps the source pixel `anchor` in place when the bitmap is swapped. */
export function annotationShift(before: PlacedBitmap, after: PlacedBitmap, anchor: Point): Point {
  const toCanvas = (placed: PlacedBitmap): Point => ({
    x: placed.rect.x + (anchor.x + placed.origin.x) * (placed.rect.width / placed.width),
    y: placed.rect.y + (anchor.y + placed.origin.y) * (placed.rect.height / placed.height),
  });

  const from = toCanvas(before);
  const to = toCanvas(after);
  return { x: to.x - from.x, y: to.y - from.y };
}

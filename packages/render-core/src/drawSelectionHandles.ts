import type { Annotation } from '@xcreener/editor-core';
import { getAnnotationBounds, getResizeHandles } from '@xcreener/editor-core';

const HANDLE_SIZE = 8;

export function drawSelectionHandles(ctx: CanvasRenderingContext2D, annotation: Annotation): void {
  const bounds = getAnnotationBounds(annotation);
  const handles = getResizeHandles(annotation);

  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (annotation.type === 'line' || annotation.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(annotation.x1, annotation.y1);
    ctx.lineTo(annotation.x2, annotation.y2);
    ctx.stroke();
  } else {
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;

  for (const handle of handles) {
    ctx.beginPath();
    ctx.rect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

import type { Annotation } from '@snapglow/editor-core';

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = Math.max(10, strokeWidth * 4);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

export function drawAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[]): void {
  for (const annotation of annotations) {
    ctx.save();
    switch (annotation.type) {
      case 'highlight':
        ctx.globalAlpha = annotation.opacity;
        ctx.fillStyle = annotation.color;
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
        break;
      case 'rect':
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        if (annotation.fill) {
          ctx.fillStyle = annotation.fill;
          ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
        }
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
        break;
      case 'ellipse':
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(
          annotation.x + annotation.width / 2,
          annotation.y + annotation.height / 2,
          Math.abs(annotation.width) / 2,
          Math.abs(annotation.height) / 2,
          0,
          0,
          Math.PI * 2
        );
        if (annotation.fill) {
          ctx.fillStyle = annotation.fill;
          ctx.fill();
        }
        ctx.stroke();
        break;
      case 'line':
        ctx.strokeStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(annotation.x1, annotation.y1);
        ctx.lineTo(annotation.x2, annotation.y2);
        ctx.stroke();
        break;
      case 'arrow':
        ctx.strokeStyle = annotation.stroke;
        ctx.fillStyle = annotation.stroke;
        ctx.lineWidth = annotation.strokeWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(annotation.x1, annotation.y1);
        ctx.lineTo(annotation.x2, annotation.y2);
        ctx.stroke();
        drawArrowHead(ctx, annotation.x1, annotation.y1, annotation.x2, annotation.y2, annotation.strokeWidth);
        break;
      case 'text':
        ctx.font = `${annotation.fontSize}px ${annotation.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = annotation.color;
        ctx.fillText(annotation.text, annotation.x, annotation.y);
        break;
      default:
        break;
    }
    ctx.restore();
  }
}

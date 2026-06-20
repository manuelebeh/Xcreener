import type { Annotation, ResizeHandleId } from './types';
import { getAnnotationBounds } from './utils';

export function resizeAnnotation(
  annotation: Annotation,
  handleId: ResizeHandleId,
  pointerX: number,
  pointerY: number,
  anchor: { x: number; y: number }
): Annotation {
  switch (annotation.type) {
    case 'rect':
    case 'ellipse':
    case 'highlight':
    case 'blur':
      return resizeBoxAnnotation(annotation, handleId, pointerX, pointerY, anchor);
    case 'text':
      return resizeTextAnnotation(annotation, handleId, pointerX, pointerY, anchor);
    case 'arrow':
    case 'line':
      return resizeLineAnnotation(annotation, handleId, pointerX, pointerY);
  }
}

function resizeBoxAnnotation<
  T extends Extract<Annotation, { type: 'rect' | 'ellipse' | 'highlight' | 'blur' }>,
>(
  annotation: T,
  handleId: ResizeHandleId,
  pointerX: number,
  pointerY: number,
  anchor: { x: number; y: number }
): T {
  const bounds = getAnnotationBounds(annotation);
  let { x, y, width, height } = bounds;

  switch (handleId) {
    case 'nw':
      x = pointerX;
      y = pointerY;
      width = anchor.x - pointerX;
      height = anchor.y - pointerY;
      break;
    case 'n':
      y = pointerY;
      height = anchor.y - pointerY;
      break;
    case 'ne':
      y = pointerY;
      width = pointerX - anchor.x;
      height = anchor.y - pointerY;
      break;
    case 'e':
      width = pointerX - anchor.x;
      break;
    case 'se':
      width = pointerX - anchor.x;
      height = pointerY - anchor.y;
      break;
    case 's':
      height = pointerY - anchor.y;
      break;
    case 'sw':
      x = pointerX;
      width = anchor.x - pointerX;
      height = pointerY - anchor.y;
      break;
    case 'w':
      x = pointerX;
      width = anchor.x - pointerX;
      break;
    default:
      break;
  }

  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }

  return { ...annotation, x, y, width, height };
}

function resizeTextAnnotation(
  annotation: Extract<Annotation, { type: 'text' }>,
  handleId: ResizeHandleId,
  pointerX: number,
  pointerY: number,
  anchor: { x: number; y: number }
): Extract<Annotation, { type: 'text' }> {
  const bounds = getAnnotationBounds(annotation);
  const resized = resizeBoxAnnotation(
    {
      type: 'rect',
      id: annotation.id,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: '',
      strokeWidth: 0,
      fill: null,
    },
    handleId,
    pointerX,
    pointerY,
    anchor
  );

  const scale = Math.max(0.5, resized.width / Math.max(bounds.width, 1));
  const fontSize = Math.round(Math.max(12, Math.min(120, annotation.fontSize * scale)));

  return {
    ...annotation,
    x: resized.x,
    y: resized.y,
    fontSize,
  };
}

function resizeLineAnnotation(
  annotation: Extract<Annotation, { type: 'arrow' | 'line' }>,
  handleId: ResizeHandleId,
  pointerX: number,
  pointerY: number
): Extract<Annotation, { type: 'arrow' | 'line' }> {
  if (handleId === 'start') {
    return { ...annotation, x1: pointerX, y1: pointerY };
  }
  if (handleId === 'end') {
    return { ...annotation, x2: pointerX, y2: pointerY };
  }
  return annotation;
}

export function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  switch (annotation.type) {
    case 'text':
    case 'rect':
    case 'ellipse':
    case 'highlight':
    case 'blur':
      return { ...annotation, x: annotation.x + dx, y: annotation.y + dy };
    case 'arrow':
    case 'line':
      return {
        ...annotation,
        x1: annotation.x1 + dx,
        y1: annotation.y1 + dy,
        x2: annotation.x2 + dx,
        y2: annotation.y2 + dy,
      };
  }
}

export function getResizeAnchor(
  annotation: Annotation,
  handleId: ResizeHandleId
): { x: number; y: number } {
  const bounds = getAnnotationBounds(annotation);

  switch (handleId) {
    case 'nw':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case 'n':
      return { x: bounds.x, y: bounds.y + bounds.height };
    case 'ne':
      return { x: bounds.x, y: bounds.y + bounds.height };
    case 'e':
      return { x: bounds.x, y: bounds.y };
    case 'se':
      return { x: bounds.x, y: bounds.y };
    case 's':
      return { x: bounds.x, y: bounds.y };
    case 'sw':
      return { x: bounds.x + bounds.width, y: bounds.y };
    case 'w':
      return { x: bounds.x + bounds.width, y: bounds.y };
    case 'start':
      return {
        x: annotation.type === 'line' || annotation.type === 'arrow' ? annotation.x2 : bounds.x,
        y: annotation.type === 'line' || annotation.type === 'arrow' ? annotation.y2 : bounds.y,
      };
    case 'end':
      return {
        x: annotation.type === 'line' || annotation.type === 'arrow' ? annotation.x1 : bounds.x,
        y: annotation.type === 'line' || annotation.type === 'arrow' ? annotation.y1 : bounds.y,
      };
    default:
      return { x: bounds.x, y: bounds.y };
  }
}

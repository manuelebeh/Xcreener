import type { Annotation, ResizeHandle, ResizeHandleId } from '../annotations/types';
import { getAnnotationBounds } from '../annotations/utils';

const HANDLE_RADIUS = 6;
const LINE_HIT_TOLERANCE = 8;

function pointInRect(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  return px >= x && px <= x + width && py >= y && py <= y + height;
}

function pointInEllipse(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function hitTestAnnotation(
  annotations: Annotation[],
  x: number,
  y: number
): Annotation | null {
  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];
    if (!annotation) {
      continue;
    }

    if (hitTestSingleAnnotation(annotation, x, y)) {
      return annotation;
    }
  }

  return null;
}

export function hitTestSingleAnnotation(annotation: Annotation, x: number, y: number): boolean {
  switch (annotation.type) {
    case 'text': {
      const bounds = getAnnotationBounds(annotation);
      return pointInRect(x, y, bounds.x, bounds.y, bounds.width, bounds.height);
    }
    case 'rect':
    case 'highlight':
    case 'blur':
      return pointInRect(x, y, annotation.x, annotation.y, annotation.width, annotation.height);
    case 'ellipse':
      return pointInEllipse(x, y, annotation.x, annotation.y, annotation.width, annotation.height);
    case 'arrow':
    case 'line':
      return (
        distanceToSegment(x, y, annotation.x1, annotation.y1, annotation.x2, annotation.y2) <=
        LINE_HIT_TOLERANCE + annotation.strokeWidth / 2
      );
  }
}

export function getResizeHandles(annotation: Annotation): ResizeHandle[] {
  switch (annotation.type) {
    case 'text': {
      const bounds = getAnnotationBounds(annotation);
      return bboxHandles(bounds);
    }
    case 'rect':
    case 'ellipse':
    case 'highlight':
    case 'blur':
      return bboxHandles(annotation);
    case 'arrow':
    case 'line':
      return [
        { id: 'start', x: annotation.x1, y: annotation.y1 },
        { id: 'end', x: annotation.x2, y: annotation.y2 },
      ];
  }
}

function bboxHandles(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): ResizeHandle[] {
  const { x, y, width, height } = rect;
  const midX = x + width / 2;
  const midY = y + height / 2;
  const right = x + width;
  const bottom = y + height;

  return [
    { id: 'nw', x, y },
    { id: 'n', x: midX, y },
    { id: 'ne', x: right, y },
    { id: 'e', x: right, y: midY },
    { id: 'se', x: right, y: bottom },
    { id: 's', x: midX, y: bottom },
    { id: 'sw', x, y: bottom },
    { id: 'w', x, y: midY },
  ];
}

export function hitTestHandle(
  handles: ResizeHandle[],
  x: number,
  y: number,
  radius = HANDLE_RADIUS
): ResizeHandleId | null {
  for (const handle of handles) {
    if (Math.hypot(x - handle.x, y - handle.y) <= radius) {
      return handle.id;
    }
  }
  return null;
}

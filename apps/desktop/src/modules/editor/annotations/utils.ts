import type { Annotation, AnnotationBounds, LayoutRect } from './types';

let annotationIdCounter = 0;

export function createAnnotationId(): string {
  annotationIdCounter += 1;
  return `ann-${Date.now()}-${annotationIdCounter}`;
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): LayoutRect {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  return {
    x,
    y,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function getAnnotationBounds(annotation: Annotation): AnnotationBounds {
  switch (annotation.type) {
    case 'text': {
      const width = Math.max(40, annotation.text.length * annotation.fontSize * 0.55);
      const height = annotation.fontSize * 1.4;
      return { x: annotation.x, y: annotation.y, width, height };
    }
    case 'rect':
    case 'ellipse':
    case 'highlight':
    case 'blur':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'arrow':
    case 'line': {
      const rect = normalizeRect(annotation.x1, annotation.y1, annotation.x2, annotation.y2);
      return {
        ...rect,
        x1: annotation.x1,
        y1: annotation.y1,
        x2: annotation.x2,
        y2: annotation.y2,
      };
    }
  }
}

export function cloneAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.map((annotation) => ({ ...annotation }));
}

function isBoxAnnotation(
  annotation: Annotation
): annotation is Extract<Annotation, { type: 'rect' | 'ellipse' | 'highlight' | 'blur' }> {
  return (
    annotation.type === 'rect' ||
    annotation.type === 'ellipse' ||
    annotation.type === 'highlight' ||
    annotation.type === 'blur'
  );
}

export function isAnnotationTooSmall(annotation: Annotation): boolean {
  if (!isBoxAnnotation(annotation)) {
    return false;
  }
  return annotation.width < 2 && annotation.height < 2;
}

export function isDrawTool(
  tool: string
): tool is 'rect' | 'ellipse' | 'arrow' | 'line' | 'highlight' | 'blur' {
  return (
    tool === 'rect' ||
    tool === 'ellipse' ||
    tool === 'arrow' ||
    tool === 'line' ||
    tool === 'highlight' ||
    tool === 'blur'
  );
}

import type { Annotation, EditorTool, TextAnnotation, ToolDefaults } from './types';
import { createAnnotationId, normalizeRect } from './utils';

export function createAnnotationFromDrag(
  tool: EditorTool,
  defaults: ToolDefaults,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: { allowEmptySize?: boolean }
): Annotation | null {
  const rect = normalizeRect(x1, y1, x2, y2);
  const id = createAnnotationId();

  if (
    !options?.allowEmptySize &&
    rect.width < 2 &&
    rect.height < 2 &&
    tool !== 'arrow' &&
    tool !== 'line'
  ) {
    return null;
  }

  switch (tool) {
    case 'rect':
      return {
        type: 'rect',
        id,
        ...rect,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        fill: defaults.fill,
      };
    case 'ellipse':
      return {
        type: 'ellipse',
        id,
        ...rect,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        fill: defaults.fill,
      };
    case 'highlight':
      return {
        type: 'highlight',
        id,
        ...rect,
        color: defaults.highlightColor,
        opacity: defaults.highlightOpacity,
      };
    case 'blur':
      return {
        type: 'blur',
        id,
        ...rect,
        mode: defaults.blurMode,
        intensity: defaults.blurIntensity,
      };
    case 'arrow':
      return {
        type: 'arrow',
        id,
        x1,
        y1,
        x2,
        y2,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
      };
    case 'line':
      return {
        type: 'line',
        id,
        x1,
        y1,
        x2,
        y2,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
      };
    default:
      return null;
  }
}

export function createTextAnnotation(
  defaults: ToolDefaults,
  x: number,
  y: number,
  text = 'Text'
): TextAnnotation {
  return {
    type: 'text',
    id: createAnnotationId(),
    x,
    y,
    text,
    fontFamily: defaults.fontFamily,
    fontSize: defaults.fontSize,
    color: defaults.textColor,
    backgroundColor: defaults.textBackgroundColor,
  };
}

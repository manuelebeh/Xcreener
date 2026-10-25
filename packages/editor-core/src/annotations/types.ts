export type EditorTool =
  | 'select'
  | 'move'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'highlight'
  | 'blur';

export type BlurMode = 'gaussian' | 'pixelate' | 'solid';

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end';

export interface ToolDefaults {
  stroke: string;
  strokeWidth: number;
  fill: string | null;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textBackgroundColor: string | null;
  highlightColor: string;
  highlightOpacity: number;
  blurMode: BlurMode;
  blurIntensity: number;
}

export interface TextAnnotation {
  type: 'text';
  id: string;
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string | null;
}

export interface RectAnnotation {
  type: 'rect';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
}

export interface EllipseAnnotation {
  type: 'ellipse';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string | null;
}

export interface ArrowAnnotation {
  type: 'arrow';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface LineAnnotation {
  type: 'line';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface HighlightAnnotation {
  type: 'highlight';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
}

export interface BlurAnnotation {
  type: 'blur';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mode: BlurMode;
  intensity: number;
  /** Fill of the `solid` mode; black when unset. */
  color?: string;
}

export type Annotation =
  | TextAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | HighlightAnnotation
  | BlurAnnotation;

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationBounds extends LayoutRect {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface ResizeHandle {
  id: ResizeHandleId;
  x: number;
  y: number;
}

export const DEFAULT_TOOL_DEFAULTS: ToolDefaults = {
  stroke: '#ef4444',
  strokeWidth: 3,
  fill: null,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 24,
  textColor: '#ef4444',
  textBackgroundColor: null,
  highlightColor: '#facc15',
  highlightOpacity: 0.4,
  blurMode: 'gaussian',
  blurIntensity: 12,
};

export const HISTORY_MAX = 20;

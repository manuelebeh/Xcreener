export type CaptureType = 'region' | 'window' | 'fullscreen' | 'scroll' | 'menu';

export type CaptureMode = CaptureType | 'idle';

export type CaptureDelaySecs = 0 | 3 | 5 | 10;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}

export interface WindowInfo {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOverlayInitPayload {
  bounds: CaptureOverlayBounds;
  monitors: MonitorInfo[];
  previewPng?: number[];
  liveOverlay?: boolean;
  webviewLayout?: OverlayWebviewLayout;
}

export interface CaptureNativeRequest {
  kind: CaptureType;
  rect?: Rect;
  windowId?: number;
  monitorId?: number;
  delaySecs: CaptureDelaySecs;
}

export interface CaptureProgressPayload {
  phase: 'countdown' | 'scroll';
  remainingSecs?: number;
  current?: number;
  total?: number;
}

export interface OverlayWebviewLayout {
  scaleFactor: number;
  innerWidth: number;
  innerHeight: number;
}

export interface SensitiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: string;
}

export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OcrEngineMode = 'auto' | 'native' | 'tesseract';

export interface RecognizeTextOptions {
  engine: OcrEngineMode;
  languages: string[];
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ContentClass = 'code' | 'ui' | 'terminal' | 'photo' | 'diagram' | 'text';

export interface ClassificationResult {
  class: ContentClass;
  confidence: number;
  latencyMs: number;
}

export interface CaptureMetadata {
  filename: string;
  filepath: string;
  width: number;
  height: number;
  format: 'png' | 'jpg' | 'webp';
  fileSize: number;
}

export interface CaptureImagePayload {
  bytes: number[];
  width: number;
  height: number;
}

export interface CaptureErrorPayload {
  message: string;
}

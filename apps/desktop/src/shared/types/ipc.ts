export type CaptureType = 'region' | 'window' | 'fullscreen';

export type CaptureMode = CaptureType | 'idle';

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
  previewPng: number[];
  webviewLayout?: OverlayWebviewLayout;
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

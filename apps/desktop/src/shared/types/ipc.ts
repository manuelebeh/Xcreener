export type CaptureType = 'region' | 'window' | 'fullscreen';

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

export type DetectionKind = 'email' | 'phone' | 'card' | 'api_key' | 'url' | 'password';

export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SensitiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: DetectionKind;
}

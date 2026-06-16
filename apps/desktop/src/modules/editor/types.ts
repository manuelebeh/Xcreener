export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientPreset {
  id: string;
  name: string;
  angle: number;
  stops: GradientStop[];
}

export type BackgroundConfig =
  | { type: 'gradient'; presetId: string }
  | { type: 'solid'; color: string }
  | { type: 'image'; source: ImageBitmap | null };

export interface ShadowConfig {
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputedLayout {
  canvasWidth: number;
  canvasHeight: number;
  screenshot: LayoutRect;
}

export interface RenderInput {
  screenshot: ImageBitmap;
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
}

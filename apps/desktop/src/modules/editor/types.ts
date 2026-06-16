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

export type AspectRatio = '16:9' | '4:3' | '1:1' | '1.91:1' | 'free';

export type PresetCategory = 'social' | 'standard' | 'custom';

export interface FramePreset {
  id: string;
  name: string;
  category: PresetCategory;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  icon?: string;
}

export interface ScreenshotTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_TRANSFORM: ScreenshotTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

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
  content: LayoutRect;
}

import type { Annotation } from './annotations/types';

export interface RenderInput {
  screenshot: ImageBitmap;
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
  frame: FramePreset | null;
  transform: ScreenshotTransform;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
}

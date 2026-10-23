import type { Annotation } from './annotations/types';

export interface ScreenshotDimensions {
  width: number;
  height: number;
}

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
  | { type: 'image'; sourceId: string | null };

export interface ShadowConfig {
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
}

export type AspectRatio = `${number}:${number}` | 'free';

export type PresetCategory = 'social' | 'standard' | 'custom';

export type SocialNetwork =
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'threads'
  | 'reddit'
  | 'pinterest'
  | 'snapchat'
  | 'producthunt'
  | 'dribbble';

export interface FramePreset {
  id: string;
  name: string;
  category: PresetCategory;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  icon?: string;
  network?: SocialNetwork;
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

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface WatermarkConfig {
  enabled: boolean;
  logoPath?: string | null;
  displayName?: string | null;
  url?: string | null;
  position: WatermarkPosition;
  opacity: number;
}

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  logoPath: null,
  displayName: 'SnapGlow',
  url: null,
  position: 'bottom-right',
  /** Percent (0-100), like the desktop setting; drawWatermark divides by 100. */
  opacity: 45,
};

export interface RenderInput {
  screenshot: ScreenshotDimensions;
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
  frame: FramePreset | null;
  transform: ScreenshotTransform;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  watermark?: WatermarkConfig;
}

export const DEFAULT_BORDER_RADIUS = 12;

export const DEFAULT_SHADOW: ShadowConfig = {
  opacity: 0.35,
  blur: 24,
  offsetX: 0,
  offsetY: 8,
  color: '#000000',
};

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'gradient',
  presetId: 'snapglow-brand',
};

import type { FramePreset, LayoutRect, ScreenshotTransform, ShadowConfig } from '../types';
import { DEFAULT_TRANSFORM } from '../types';
import { autoFramePadding, autoPadding } from './computeLayout';

export const FREE_PRESET_ID = 'free';

const BASE_SHADOW: ShadowConfig = {
  opacity: 0.35,
  blur: 24,
  offsetX: 0,
  offsetY: 8,
  color: '#000000',
};

export interface PresetStyleDefaults {
  borderRadius: number;
  shadow: ShadowConfig;
}

export const PRESET_STYLE_DEFAULTS: Record<string, PresetStyleDefaults> = {
  twitter: { borderRadius: 12, shadow: BASE_SHADOW },
  linkedin: { borderRadius: 12, shadow: { ...BASE_SHADOW, blur: 20, offsetY: 10 } },
  facebook: { borderRadius: 12, shadow: BASE_SHADOW },
  instagram: {
    borderRadius: 16,
    shadow: { opacity: 0.4, blur: 32, offsetX: 0, offsetY: 12, color: '#000000' },
  },
  youtube: { borderRadius: 10, shadow: { ...BASE_SHADOW, blur: 20, offsetY: 6 } },
  'ratio-16-9': { borderRadius: 12, shadow: BASE_SHADOW },
  'ratio-4-3': { borderRadius: 12, shadow: BASE_SHADOW },
  'ratio-1-1': { borderRadius: 14, shadow: BASE_SHADOW },
};

export function getPresetStyleDefaults(presetId: string): PresetStyleDefaults | null {
  return PRESET_STYLE_DEFAULTS[presetId] ?? null;
}

export function resolvePresetPadding(
  frame: FramePreset | null,
  screenshot: ImageBitmap,
  paddingTouched: boolean,
  currentPadding: number
): number {
  if (paddingTouched) {
    return currentPadding;
  }

  if (frame && frame.aspectRatio !== 'free' && frame.width > 0 && frame.height > 0) {
    return autoFramePadding(frame);
  }

  return autoPadding(screenshot);
}

const FREE_PRESET: FramePreset = {
  id: FREE_PRESET_ID,
  name: 'Free',
  category: 'standard',
  width: 0,
  height: 0,
  aspectRatio: 'free',
};

export const SOCIAL_PRESETS: FramePreset[] = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'social',
    width: 1600,
    height: 900,
    aspectRatio: '16:9',
    icon: 'twitter',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    icon: 'linkedin',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    icon: 'facebook',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    icon: 'instagram',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'social',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    icon: 'youtube',
  },
];

export const STANDARD_PRESETS: FramePreset[] = [
  {
    id: 'ratio-16-9',
    name: '16:9',
    category: 'standard',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
  },
  {
    id: 'ratio-4-3',
    name: '4:3',
    category: 'standard',
    width: 1600,
    height: 1200,
    aspectRatio: '4:3',
  },
  {
    id: 'ratio-1-1',
    name: '1:1',
    category: 'standard',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
  },
  FREE_PRESET,
];

export const BUILT_IN_PRESETS: FramePreset[] = [...SOCIAL_PRESETS, ...STANDARD_PRESETS];

export function getPresetById(
  id: string | null,
  customPresets: FramePreset[] = []
): FramePreset | null {
  if (!id || id === FREE_PRESET_ID) {
    return null;
  }

  const builtIn = BUILT_IN_PRESETS.find((p) => p.id === id);
  if (builtIn && builtIn.id !== FREE_PRESET_ID) {
    return builtIn;
  }

  return customPresets.find((p) => p.id === id) ?? null;
}

export function fitTransform(screenshot: ImageBitmap, content: LayoutRect): ScreenshotTransform {
  if (content.width <= 0 || content.height <= 0) {
    return { ...DEFAULT_TRANSFORM };
  }

  const fitScale = Math.min(content.width / screenshot.width, content.height / screenshot.height);
  if (!Number.isFinite(fitScale) || fitScale <= 0) {
    return { ...DEFAULT_TRANSFORM };
  }

  return { ...DEFAULT_TRANSFORM };
}

export function getFreePreset(): FramePreset {
  return FREE_PRESET;
}

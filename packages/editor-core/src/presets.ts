import { autoFramePadding, autoPadding } from './computeLayout';
import type {
  AspectRatio,
  FramePreset,
  LayoutRect,
  ScreenshotDimensions,
  ScreenshotTransform,
  ShadowConfig,
  SocialNetwork,
} from './types';
import { DEFAULT_TRANSFORM } from './types';

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
  threads: {
    borderRadius: 16,
    shadow: { opacity: 0.4, blur: 32, offsetX: 0, offsetY: 12, color: '#000000' },
  },
  reddit: { borderRadius: 12, shadow: BASE_SHADOW },
  pinterest: { borderRadius: 16, shadow: BASE_SHADOW },
  snapchat: {
    borderRadius: 16,
    shadow: { opacity: 0.4, blur: 32, offsetX: 0, offsetY: 12, color: '#000000' },
  },
  producthunt: { borderRadius: 12, shadow: BASE_SHADOW },
  dribbble: { borderRadius: 12, shadow: BASE_SHADOW },
  'ratio-16-9': { borderRadius: 12, shadow: BASE_SHADOW },
  'ratio-4-3': { borderRadius: 12, shadow: BASE_SHADOW },
  'ratio-1-1': { borderRadius: 14, shadow: BASE_SHADOW },
};

export function getPresetStyleDefaults(presetId: string): PresetStyleDefaults | null {
  const network = SOCIAL_PRESETS.find((preset) => preset.id === presetId)?.network;
  return (
    PRESET_STYLE_DEFAULTS[presetId] ?? (network ? PRESET_STYLE_DEFAULTS[network] : null) ?? null
  );
}

export function resolvePresetPadding(
  frame: FramePreset | null,
  screenshot: ScreenshotDimensions,
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

export const SOCIAL_NETWORKS: { id: SocialNetwork; name: string }[] = [
  { id: 'twitter', name: 'X' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'threads', name: 'Threads' },
  { id: 'reddit', name: 'Reddit' },
  { id: 'pinterest', name: 'Pinterest' },
  { id: 'snapchat', name: 'Snapchat' },
  { id: 'producthunt', name: 'Product Hunt' },
  { id: 'dribbble', name: 'Dribbble' },
];

function socialPreset(
  network: SocialNetwork,
  id: string,
  name: string,
  width: number,
  height: number,
  aspectRatio: AspectRatio
): FramePreset {
  return { id, name, category: 'social', width, height, aspectRatio, icon: network, network };
}

// Sizes checked against platform docs and 2026 guides (Oct 2026). The first
// variant of each network keeps the network id so saved selections stay valid.
export const SOCIAL_PRESETS: FramePreset[] = [
  socialPreset('twitter', 'twitter', 'Post', 1600, 900, '16:9'),
  socialPreset('twitter', 'twitter-square', 'Square', 1080, 1080, '1:1'),
  socialPreset('twitter', 'twitter-portrait', 'Portrait', 1080, 1350, '4:5'),
  socialPreset('twitter', 'twitter-header', 'Header', 1500, 500, '3:1'),
  socialPreset('linkedin', 'linkedin', 'Image / link', 1200, 627, '1.91:1'),
  socialPreset('linkedin', 'linkedin-square', 'Square', 1080, 1080, '1:1'),
  socialPreset('linkedin', 'linkedin-portrait', 'Portrait / carousel', 1080, 1350, '4:5'),
  socialPreset('linkedin', 'linkedin-banner', 'Profile banner', 1584, 396, '4:1'),
  socialPreset('instagram', 'instagram', 'Square', 1080, 1080, '1:1'),
  socialPreset('instagram', 'instagram-portrait', 'Portrait', 1080, 1350, '4:5'),
  socialPreset('instagram', 'instagram-grid', 'Grid 3:4', 1080, 1440, '3:4'),
  socialPreset('instagram', 'instagram-story', 'Story / Reel', 1080, 1920, '9:16'),
  socialPreset('facebook', 'facebook', 'Link / landscape', 1200, 630, '1.91:1'),
  socialPreset('facebook', 'facebook-square', 'Square', 1080, 1080, '1:1'),
  socialPreset('facebook', 'facebook-portrait', 'Portrait', 1080, 1350, '4:5'),
  socialPreset('facebook', 'facebook-story', 'Story', 1080, 1920, '9:16'),
  socialPreset('youtube', 'youtube', 'Thumbnail', 1280, 720, '16:9'),
  socialPreset('youtube', 'youtube-shorts', 'Shorts thumbnail', 1080, 1920, '9:16'),
  socialPreset('youtube', 'youtube-post', 'Post', 1080, 1080, '1:1'),
  socialPreset('threads', 'threads', 'Portrait', 1080, 1350, '4:5'),
  socialPreset('threads', 'threads-square', 'Square', 1080, 1080, '1:1'),
  socialPreset('reddit', 'reddit', 'Portrait', 1080, 1350, '4:5'),
  socialPreset('reddit', 'reddit-square', 'Square', 1080, 1080, '1:1'),
  socialPreset('reddit', 'reddit-landscape', 'Landscape', 1200, 900, '4:3'),
  socialPreset('pinterest', 'pinterest', 'Pin', 1000, 1500, '2:3'),
  socialPreset('pinterest', 'pinterest-square', 'Square', 1000, 1000, '1:1'),
  socialPreset('snapchat', 'snapchat', 'Story / Spotlight', 1080, 1920, '9:16'),
  socialPreset('producthunt', 'producthunt', 'Gallery', 1270, 760, '1.67:1'),
  socialPreset('dribbble', 'dribbble', 'Shot', 1600, 1200, '4:3'),
];

export function getNetworkPresets(network: SocialNetwork): FramePreset[] {
  return SOCIAL_PRESETS.filter((preset) => preset.network === network);
}

/** Display name, prefixed with the network for social variants ("Snapchat · Story / Spotlight"). */
export function getPresetLabel(preset: FramePreset): string {
  const network = SOCIAL_NETWORKS.find((n) => n.id === preset.network);
  return network ? `${network.name} · ${preset.name}` : preset.name;
}

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

export function fitTransform(
  screenshot: ScreenshotDimensions,
  content: LayoutRect
): ScreenshotTransform {
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

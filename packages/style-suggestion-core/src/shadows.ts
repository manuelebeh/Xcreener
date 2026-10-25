import type { ShadowConfig } from '@xcreener/editor-core';

export const SHADOW_NONE: ShadowConfig = {
  opacity: 0,
  blur: 0,
  offsetX: 0,
  offsetY: 0,
  color: '#000000',
};

export const SHADOW_LIGHT: ShadowConfig = {
  opacity: 0.2,
  blur: 16,
  offsetX: 0,
  offsetY: 4,
  color: '#000000',
};

export const SHADOW_MEDIUM: ShadowConfig = {
  opacity: 0.3,
  blur: 20,
  offsetX: 0,
  offsetY: 6,
  color: '#000000',
};

export const SHADOW_STRONG: ShadowConfig = {
  opacity: 0.45,
  blur: 32,
  offsetX: 0,
  offsetY: 12,
  color: '#000000',
};

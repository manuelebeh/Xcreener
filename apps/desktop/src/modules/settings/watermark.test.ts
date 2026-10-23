import { DEFAULT_WATERMARK } from '@snapglow/editor-core';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => path }));

import { watermarkFromSettings } from './watermark';

const customized = {
  watermarkEnabled: false,
  watermarkDisplayName: '',
  watermarkUrl: 'https://me.dev',
  watermarkLogoPath: '/Users/me/logo.png',
  watermarkPosition: 'top-left' as const,
  watermarkOpacity: 10,
  useTeamBrandKit: false,
};

describe('watermarkFromSettings', () => {
  it('forces the SnapGlow badge on free plans, keeping only the corner', () => {
    expect(watermarkFromSettings(customized, false)).toEqual({
      ...DEFAULT_WATERMARK,
      position: 'top-left',
    });
  });

  it('applies the saved settings on paid plans', () => {
    expect(watermarkFromSettings(customized, true)).toEqual({
      enabled: false,
      logoPath: '/Users/me/logo.png',
      displayName: null,
      url: 'https://me.dev',
      position: 'top-left',
      opacity: 10,
    });
  });
});

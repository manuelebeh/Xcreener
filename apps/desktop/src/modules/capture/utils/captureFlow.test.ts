import { describe, expect, it } from 'vitest';
import {
  isVideoTargetEnabled,
  normalizeTargetForMediaKind,
  targetModesForMediaKind,
} from './captureModes';
import { isLiveOverlayMode, needsNativeCapture } from './captureFlow';

describe('captureModes', () => {
  it('lists photo and video target modes', () => {
    expect(targetModesForMediaKind('photo').map((m) => m.id)).toEqual([
      'region',
      'window',
      'fullscreen',
      'scroll',
      'menu',
    ]);
    expect(targetModesForMediaKind('video').map((m) => m.id)).toEqual([
      'region',
      'window',
      'fullscreen',
    ]);
  });

  it('normalizes invalid targets when switching media kind', () => {
    expect(normalizeTargetForMediaKind('scroll', 'video')).toBe('region');
    expect(normalizeTargetForMediaKind('window', 'photo')).toBe('window');
  });

  it('enables region-only video targets for MVP', () => {
    expect(isVideoTargetEnabled('region')).toBe(true);
    expect(isVideoTargetEnabled('window')).toBe(false);
    expect(isVideoTargetEnabled('fullscreen')).toBe(false);
  });
});

describe('captureFlow', () => {
  it('uses native capture for scroll, menu, delayed photo, and all video modes', () => {
    expect(needsNativeCapture('region', 0)).toBe(false);
    expect(needsNativeCapture('region', 3)).toBe(true);
    expect(needsNativeCapture('scroll', 0)).toBe(true);
    expect(needsNativeCapture('menu', 3)).toBe(true);
    expect(needsNativeCapture('region', 0, 'video')).toBe(true);
  });

  it('treats menu mode as live overlay', () => {
    expect(isLiveOverlayMode('menu', false)).toBe(true);
    expect(isLiveOverlayMode('region', true)).toBe(true);
    expect(isLiveOverlayMode('region', false)).toBe(false);
  });
});

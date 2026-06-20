import { describe, expect, it } from 'vitest';
import { isLiveOverlayMode, needsNativeCapture } from './captureFlow';

describe('captureFlow', () => {
  it('uses native capture for scroll, menu, and delayed modes', () => {
    expect(needsNativeCapture('region', 0)).toBe(false);
    expect(needsNativeCapture('region', 3)).toBe(true);
    expect(needsNativeCapture('scroll', 0)).toBe(true);
    expect(needsNativeCapture('menu', 3)).toBe(true);
  });

  it('treats menu mode as live overlay', () => {
    expect(isLiveOverlayMode('menu', false)).toBe(true);
    expect(isLiveOverlayMode('region', true)).toBe(true);
    expect(isLiveOverlayMode('region', false)).toBe(false);
  });
});

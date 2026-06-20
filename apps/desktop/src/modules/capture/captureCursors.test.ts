import { describe, expect, it } from 'vitest';
import { CAPTURE_CAMERA_CURSOR, captureOverlayCursor } from './captureCursors';

describe('captureOverlayCursor', () => {
  it('uses camera cursor for window, fullscreen, and scroll modes', () => {
    expect(captureOverlayCursor('window')).toBe(CAPTURE_CAMERA_CURSOR);
    expect(captureOverlayCursor('fullscreen')).toBe(CAPTURE_CAMERA_CURSOR);
    expect(captureOverlayCursor('scroll')).toBe(CAPTURE_CAMERA_CURSOR);
  });

  it('uses crosshair for region and menu modes', () => {
    expect(captureOverlayCursor('region')).toBe('crosshair');
    expect(captureOverlayCursor('menu')).toBe('crosshair');
  });

  it('returns undefined for idle mode', () => {
    expect(captureOverlayCursor('idle')).toBeUndefined();
  });
});

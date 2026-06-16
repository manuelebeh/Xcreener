import { describe, expect, it } from 'vitest';
import { CAPTURE_CAMERA_CURSOR, captureOverlayCursor } from './captureCursors';

describe('captureOverlayCursor', () => {
  it('uses camera cursor for window and fullscreen modes', () => {
    expect(captureOverlayCursor('window')).toBe(CAPTURE_CAMERA_CURSOR);
    expect(captureOverlayCursor('fullscreen')).toBe(CAPTURE_CAMERA_CURSOR);
  });

  it('uses crosshair for region mode', () => {
    expect(captureOverlayCursor('region')).toBe('crosshair');
  });

  it('returns undefined for idle mode', () => {
    expect(captureOverlayCursor('idle')).toBeUndefined();
  });
});

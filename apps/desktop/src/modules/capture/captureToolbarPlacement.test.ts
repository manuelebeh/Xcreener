import { describe, expect, it, vi } from 'vitest';
import { captureToolbarContainerStyle, captureToolbarStyle } from './captureToolbarPlacement';

const bounds = { x: 0, y: 0, width: 1920, height: 1080 };
const monitors = [
  {
    id: 0,
    name: 'Primary',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    scaleFactor: 1.25,
    isPrimary: true,
  },
];
const viewport125 = { width: 1536, height: 864 };

describe('captureToolbarContainerStyle', () => {
  it('anchors to the primary monitor frame at 125% Windows scale', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });

    expect(captureToolbarContainerStyle(bounds, monitors, viewport125)).toEqual({
      position: 'absolute',
      left: 0,
      top: 0,
      width: 1536,
      height: 864,
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      padding: 24,
      pointerEvents: 'none',
      zIndex: 9999,
    });
  });

  it('pins to the visible bottom-center on macOS', () => {
    vi.stubGlobal('navigator', { userAgent: 'Macintosh' });

    expect(captureToolbarContainerStyle(bounds, monitors, viewport125)).toEqual({
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'auto',
      zIndex: 9999,
    });
  });
});

describe('captureToolbarStyle', () => {
  it('enables pointer events on Windows', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });
    expect(captureToolbarStyle()).toEqual({ pointerEvents: 'auto' });
  });
});

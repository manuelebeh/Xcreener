import { describe, expect, it, vi } from 'vitest';
import {
  boundsRectToCss,
  clientToBounds,
  getOverlayViewport,
  resolveWindowsDisplayScale,
  viewportRectToBounds,
} from './overlayCoordinates';

const bounds = { x: 0, y: 0, width: 1920, height: 1080 };
const viewport125 = { width: 1536, height: 864 };
const monitors125 = [
  {
    id: 0,
    name: 'Primary',
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    scaleFactor: 1,
    isPrimary: true,
  },
];

describe('resolveWindowsDisplayScale', () => {
  it('uses devicePixelRatio when xcap reports scale 1.0', () => {
    vi.stubGlobal('window', {
      devicePixelRatio: 1.25,
      visualViewport: { width: 1920, height: 1080 },
    });

    expect(resolveWindowsDisplayScale(bounds, monitors125, 1920)).toBe(1.25);
  });
});

describe('getOverlayViewport', () => {
  it('uses bounds when inner size matches at 100% scale', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      visualViewport: { width: 1920, height: 1080 },
    });

    expect(getOverlayViewport(bounds, monitors125)).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('shrinks viewport when inner reports bounds but devicePixelRatio is 125%', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1.25,
      visualViewport: { width: 1920, height: 1080 },
    });

    expect(getOverlayViewport(bounds, monitors125)).toEqual(viewport125);
  });

  it('uses inner size when layout is already smaller than bounds', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });
    vi.stubGlobal('window', {
      innerWidth: 1536,
      innerHeight: 864,
      devicePixelRatio: 1.25,
      visualViewport: { width: 1536, height: 864 },
    });

    expect(getOverlayViewport(bounds, monitors125)).toEqual(viewport125);
  });

  it('uses Tauri webview scale when devicePixelRatio is unavailable', () => {
    vi.stubGlobal('navigator', { userAgent: 'Windows NT 10.0' });
    vi.stubGlobal('window', {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      visualViewport: { width: 1920, height: 1080 },
    });

    expect(
      getOverlayViewport(bounds, monitors125, {
        webviewLayout: { scaleFactor: 1.5, innerWidth: 1920, innerHeight: 1080 },
      })
    ).toEqual({ width: 1280, height: 720 });
  });
});

describe('overlayCoordinates', () => {
  it('maps client coords to bounds space at 125% scale', () => {
    expect(clientToBounds(768, 432, bounds, viewport125)).toEqual({ x: 960, y: 540 });
  });

  it('maps bounds rects to css pixels at 125% scale', () => {
    expect(
      boundsRectToCss({ x: 960, y: 540, width: 400, height: 300 }, bounds, viewport125)
    ).toEqual({
      left: 768,
      top: 432,
      width: 320,
      height: 240,
    });
  });

  it('maps viewport selection back to preview pixels', () => {
    expect(
      viewportRectToBounds({ x: 100, y: 50, width: 200, height: 150 }, bounds, viewport125)
    ).toEqual({
      x: 125,
      y: 63,
      width: 250,
      height: 188,
    });
  });
});

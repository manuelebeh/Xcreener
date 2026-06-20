import type {
  CaptureOverlayBounds,
  MonitorInfo,
  OverlayWebviewLayout,
  Rect,
} from '@/shared/types/ipc';

export interface OverlayViewport {
  width: number;
  height: number;
}

export function isWindowsOverlay(): boolean {
  return typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent);
}

function primaryMonitor(monitors?: MonitorInfo[]): MonitorInfo | undefined {
  return monitors?.find((monitor) => monitor.isPrimary) ?? monitors?.[0];
}

/** Best-effort Windows display scale - xcap may report 1.0 when DPI-unaware. */
export function resolveWindowsDisplayScale(
  bounds: CaptureOverlayBounds,
  monitors: MonitorInfo[] | undefined,
  innerWidth: number,
  webviewScale?: number
): number {
  const primary = primaryMonitor(monitors);
  const visual = window.visualViewport;
  const visualWidth = visual?.width ?? innerWidth;

  const candidates = [
    webviewScale,
    window.devicePixelRatio,
    primary?.scaleFactor,
    visualWidth > 0 ? bounds.width / visualWidth : undefined,
    innerWidth > 0 ? bounds.width / innerWidth : undefined,
  ].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 1.01
  );

  return candidates.length > 0 ? Math.max(...candidates) : 1;
}

export interface OverlayViewportOptions {
  webviewLayout?: OverlayWebviewLayout | null;
}

export function getOverlayViewport(
  bounds?: CaptureOverlayBounds | null,
  monitors?: MonitorInfo[],
  options?: OverlayViewportOptions
): OverlayViewport {
  const inner = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  if (!bounds || bounds.width <= 0 || bounds.height <= 0 || !isWindowsOverlay()) {
    return inner;
  }

  const scale = resolveWindowsDisplayScale(
    bounds,
    monitors,
    inner.width,
    options?.webviewLayout?.scaleFactor
  );

  // innerWidth already matches the visible CSS size (e.g. 1536 at 125%).
  if (Math.abs(inner.width * scale - bounds.width) < 4) {
    return inner;
  }

  // innerWidth reports full virtual-desktop bounds while Windows scale > 100%.
  if (scale > 1.01 && Math.abs(inner.width - bounds.width) < 4) {
    return {
      width: Math.round(bounds.width / scale),
      height: Math.round(bounds.height / scale),
    };
  }

  if (Math.abs(inner.width - bounds.width) < 2 && Math.abs(inner.height - bounds.height) < 2) {
    return { width: bounds.width, height: bounds.height };
  }

  return inner;
}

/** Primary monitor rectangle in overlay CSS pixels. */
export function primaryMonitorFrameInViewport(
  bounds: CaptureOverlayBounds,
  monitors: MonitorInfo[],
  viewport: OverlayViewport
): { left: number; top: number; width: number; height: number } {
  const primary = primaryMonitor(monitors);
  if (!primary) {
    return { left: 0, top: 0, width: viewport.width, height: viewport.height };
  }

  return boundsRectToCss(
    {
      x: primary.x - bounds.x,
      y: primary.y - bounds.y,
      width: primary.width,
      height: primary.height,
    },
    bounds,
    viewport
  );
}

export function clientToBounds(
  clientX: number,
  clientY: number,
  bounds: CaptureOverlayBounds,
  viewport: OverlayViewport
): { x: number; y: number } {
  return {
    x: clientX * (bounds.width / viewport.width),
    y: clientY * (bounds.height / viewport.height),
  };
}

export function boundsRectToCss(
  rect: Pick<Rect, 'x' | 'y' | 'width' | 'height'>,
  bounds: CaptureOverlayBounds,
  viewport: OverlayViewport
): { left: number; top: number; width: number; height: number } {
  const scaleX = viewport.width / bounds.width;
  const scaleY = viewport.height / bounds.height;

  return {
    left: rect.x * scaleX,
    top: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

export function viewportRectToBounds(
  rect: Rect,
  bounds: CaptureOverlayBounds,
  viewport: OverlayViewport
): Rect {
  const scaleX = bounds.width / viewport.width;
  const scaleY = bounds.height / viewport.height;

  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}

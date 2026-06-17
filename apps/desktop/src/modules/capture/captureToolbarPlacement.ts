import type { CSSProperties } from 'react';
import type { CaptureOverlayBounds, MonitorInfo } from '@/shared/types/ipc';
import {
  isWindowsOverlay,
  type OverlayViewport,
  primaryMonitorFrameInViewport,
} from './overlayCoordinates';

const TOOLBAR_PADDING = 24;
const TOOLBAR_Z_INDEX = 9999;

/** Windows: anchor toolbar to the primary monitor's top-right in corrected CSS space. */
export function captureToolbarContainerStyle(
  bounds: CaptureOverlayBounds,
  monitors: MonitorInfo[],
  viewport: OverlayViewport
): CSSProperties {
  if (isWindowsOverlay()) {
    const frame = primaryMonitorFrameInViewport(bounds, monitors, viewport);

    return {
      position: 'absolute',
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      boxSizing: 'border-box',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      padding: TOOLBAR_PADDING,
      pointerEvents: 'none',
      zIndex: TOOLBAR_Z_INDEX,
    };
  }

  return {
    position: 'fixed',
    bottom: TOOLBAR_PADDING,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    zIndex: TOOLBAR_Z_INDEX,
  };
}

export function captureToolbarStyle(): CSSProperties {
  if (isWindowsOverlay()) {
    return { pointerEvents: 'auto' };
  }

  return {};
}

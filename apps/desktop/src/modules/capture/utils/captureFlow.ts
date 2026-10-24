import type { CaptureDelaySecs, CaptureMediaKind, CaptureMode } from '@/shared/types/ipc';

export function needsNativeCapture(
  mode: CaptureMode,
  delaySecs: CaptureDelaySecs,
  mediaKind: CaptureMediaKind = 'photo'
): boolean {
  if (mediaKind === 'video') {
    return true;
  }

  // Window captures grab the window itself so rounded corners stay transparent
  // instead of showing whatever sat behind them in the desktop preview.
  return mode === 'window' || mode === 'scroll' || mode === 'menu' || delaySecs > 0;
}

export function isLiveOverlayMode(mode: CaptureMode, liveOverlay: boolean): boolean {
  return liveOverlay || mode === 'menu';
}

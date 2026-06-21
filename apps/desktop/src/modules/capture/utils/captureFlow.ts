import type { CaptureDelaySecs, CaptureMediaKind, CaptureMode } from '@/shared/types/ipc';

export function needsNativeCapture(
  mode: CaptureMode,
  delaySecs: CaptureDelaySecs,
  mediaKind: CaptureMediaKind = 'photo'
): boolean {
  if (mediaKind === 'video') {
    return true;
  }

  return mode === 'scroll' || mode === 'menu' || delaySecs > 0;
}

export function isLiveOverlayMode(mode: CaptureMode, liveOverlay: boolean): boolean {
  return liveOverlay || mode === 'menu';
}

import type { CaptureDelaySecs, CaptureMode } from '@/shared/types/ipc';

export function needsNativeCapture(mode: CaptureMode, delaySecs: CaptureDelaySecs): boolean {
  return mode === 'scroll' || mode === 'menu' || delaySecs > 0;
}

export function isLiveOverlayMode(mode: CaptureMode, liveOverlay: boolean): boolean {
  return liveOverlay || mode === 'menu';
}

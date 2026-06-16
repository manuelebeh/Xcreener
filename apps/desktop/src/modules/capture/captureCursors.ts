import type { CaptureMode } from '@/shared/types/ipc';

/** macOS-style camera cursor for window / full-screen capture modes. */
export const CAPTURE_CAMERA_CURSOR =
  "url('/cursors/capture-camera.svg') 14 14, crosshair";

export function captureOverlayCursor(mode: CaptureMode): string | undefined {
  switch (mode) {
    case 'window':
    case 'fullscreen':
      return CAPTURE_CAMERA_CURSOR;
    case 'region':
      return 'crosshair';
    default:
      return undefined;
  }
}

import type { CaptureOverlayBounds, Rect } from '@/shared/types/ipc';

export function toOverlayRect(
  screenRect: { x: number; y: number; width: number; height: number },
  bounds: CaptureOverlayBounds
): Rect {
  return {
    x: screenRect.x - bounds.x,
    y: screenRect.y - bounds.y,
    width: screenRect.width,
    height: screenRect.height,
  };
}

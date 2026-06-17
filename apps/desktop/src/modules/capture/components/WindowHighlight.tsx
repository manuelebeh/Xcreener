import type { CaptureOverlayBounds, WindowInfo } from '@/shared/types/ipc';
import type { OverlayViewport } from '../overlayCoordinates';
import { boundsRectToCss } from '../overlayCoordinates';

interface WindowHighlightProps {
  window: WindowInfo | null;
  bounds: CaptureOverlayBounds;
  viewport: OverlayViewport;
}

export function WindowHighlight({ window, bounds, viewport }: WindowHighlightProps) {
  if (!window) {
    return null;
  }

  const style = boundsRectToCss(
    {
      x: window.x - bounds.x,
      y: window.y - bounds.y,
      width: window.width,
      height: window.height,
    },
    bounds,
    viewport
  );

  return (
    <div
      data-testid="window-highlight"
      className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style={{
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
      }}
    >
      <div className="absolute -top-7 left-0 max-w-xs truncate rounded bg-black/70 px-2 py-1 text-xs text-white">
        {window.title}
      </div>
    </div>
  );
}

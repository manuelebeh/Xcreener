import type { CaptureOverlayBounds, MonitorInfo } from '@/shared/types/ipc';
import type { OverlayViewport } from '../overlayCoordinates';
import { boundsRectToCss } from '../overlayCoordinates';

interface MonitorHighlightProps {
  monitor: MonitorInfo | null;
  bounds: CaptureOverlayBounds;
  viewport: OverlayViewport;
}

export function MonitorHighlight({ monitor, bounds, viewport }: MonitorHighlightProps) {
  if (!monitor) {
    return null;
  }

  const style = boundsRectToCss(
    {
      x: monitor.x - bounds.x,
      y: monitor.y - bounds.y,
      width: monitor.width,
      height: monitor.height,
    },
    bounds,
    viewport
  );

  return (
    <div
      data-testid="monitor-highlight"
      className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style={{
        left: style.left,
        top: style.top,
        width: style.width,
        height: style.height,
      }}
    >
      <div className="absolute -top-7 left-0 max-w-xs truncate rounded bg-black/70 px-2 py-1 text-xs text-white">
        {monitor.name}
        {monitor.isPrimary ? ' · Primary' : ''}
      </div>
    </div>
  );
}

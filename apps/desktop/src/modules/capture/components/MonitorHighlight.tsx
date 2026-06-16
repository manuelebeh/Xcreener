import type { MonitorInfo } from '@/shared/types/ipc';

interface MonitorHighlightProps {
  monitor: MonitorInfo | null;
  boundsOffset: { x: number; y: number };
}

export function MonitorHighlight({ monitor, boundsOffset }: MonitorHighlightProps) {
  if (!monitor) {
    return null;
  }

  return (
    <div
      data-testid="monitor-highlight"
      className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style={{
        left: monitor.x - boundsOffset.x,
        top: monitor.y - boundsOffset.y,
        width: monitor.width,
        height: monitor.height,
      }}
    >
      <div className="absolute -top-7 left-0 max-w-xs truncate rounded bg-black/70 px-2 py-1 text-xs text-white">
        {monitor.name}
        {monitor.isPrimary ? ' · Primary' : ''}
      </div>
    </div>
  );
}

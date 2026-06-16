import type { WindowInfo } from '@/shared/types/ipc';

interface WindowHighlightProps {
  window: WindowInfo | null;
  boundsOffset: { x: number; y: number };
}

export function WindowHighlight({ window, boundsOffset }: WindowHighlightProps) {
  if (!window) {
    return null;
  }

  return (
    <div
      data-testid="window-highlight"
      className="pointer-events-none absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
      style={{
        left: window.x - boundsOffset.x,
        top: window.y - boundsOffset.y,
        width: window.width,
        height: window.height,
      }}
    >
      <div className="absolute -top-7 left-0 max-w-xs truncate rounded bg-black/70 px-2 py-1 text-xs text-white">
        {window.title}
      </div>
    </div>
  );
}

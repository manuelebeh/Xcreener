interface CaptureProgressProps {
  phase: 'scroll';
  current: number | null;
  variant?: 'overlay' | 'hud';
  finishing?: boolean;
  onDone?: () => void;
}

function scrollLabel(current: number | null, finishing: boolean): string {
  if (finishing) {
    return 'Finishing capture…';
  }

  if (current != null && current > 0) {
    return `Scrolling capture — frame ${current}`;
  }

  return 'Scrolling capture in progress…';
}

export function CaptureProgress({
  phase,
  current,
  variant = 'overlay',
  finishing = false,
  onDone,
}: CaptureProgressProps) {
  const label = phase === 'scroll' ? scrollLabel(current, finishing) : 'Capturing';

  if (variant === 'hud') {
    return (
      <div
        data-testid="capture-progress-hud"
        className="flex h-full w-full items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="capture-hud pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 text-sm">
          <span
            className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary"
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">{label}</span>
          {onDone && !finishing ? (
            <>
              <span className="capture-hud-divider mx-0.5 h-5 w-px shrink-0" aria-hidden="true" />
              <button
                type="button"
                data-testid="capture-scroll-done"
                className="sg-focus-ring capture-hud-btn cursor-pointer rounded-full px-3 py-1 whitespace-nowrap transition-colors"
                onClick={onDone}
              >
                Done
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="capture-progress"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40"
    >
      <div className="rounded-2xl bg-black/70 px-6 py-4 text-center shadow-xl">
        <p className="text-sm uppercase tracking-wide text-white/70">
          {phase === 'scroll' ? 'Scrolling capture' : 'Capturing'}
        </p>
        <p className="mt-1 text-lg font-medium text-white">
          {finishing
            ? 'Finishing…'
            : current != null && current > 0
              ? `Frame ${current}`
              : 'Starting…'}
        </p>
      </div>
    </div>
  );
}

interface CaptureProgressProps {
  phase: 'scroll' | 'recording';
  current?: number | null;
  elapsedSecs?: number | null;
  maxDurationSecs?: number | null;
  paused?: boolean;
  variant?: 'overlay' | 'hud';
  finishing?: boolean;
  onDone?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function scrollLabel(current: number | null, finishing: boolean): string {
  if (finishing) {
    return 'Finishing capture...';
  }

  if (current != null && current > 0) {
    return `Scrolling capture - frame ${current}`;
  }

  return 'Scrolling capture in progress...';
}

function recordingLabel(
  elapsedSecs: number | null,
  maxDurationSecs: number | null,
  paused: boolean,
  finishing: boolean
): string {
  if (finishing) {
    return 'Finishing recording...';
  }

  const elapsed = elapsedSecs ?? 0;
  const max = maxDurationSecs ?? 30;
  const prefix = paused ? 'Recording paused' : 'Recording';
  return `${prefix} - ${formatElapsed(elapsed)} / ${formatElapsed(max)}`;
}

export function CaptureProgress({
  phase,
  current = null,
  elapsedSecs = null,
  maxDurationSecs = null,
  paused = false,
  variant = 'overlay',
  finishing = false,
  onDone,
  onPause,
  onResume,
}: CaptureProgressProps) {
  const label =
    phase === 'recording'
      ? recordingLabel(elapsedSecs, maxDurationSecs, paused, finishing)
      : scrollLabel(current, finishing);

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
            className={`inline-block h-2 w-2 shrink-0 rounded-full bg-primary ${
              paused || finishing ? '' : 'animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap">{label}</span>
          {phase === 'recording' && !finishing ? (
            <>
              <span className="capture-hud-divider mx-0.5 h-5 w-px shrink-0" aria-hidden="true" />
              {paused ? (
                <button
                  type="button"
                  data-testid="capture-record-resume"
                  className="sg-focus-ring capture-hud-btn cursor-pointer rounded-full px-3 py-1 whitespace-nowrap transition-colors"
                  onClick={onResume}
                >
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="capture-record-pause"
                  className="sg-focus-ring capture-hud-btn cursor-pointer rounded-full px-3 py-1 whitespace-nowrap transition-colors"
                  onClick={onPause}
                >
                  Pause
                </button>
              )}
              <button
                type="button"
                data-testid="capture-record-stop"
                className="sg-focus-ring capture-hud-btn cursor-pointer rounded-full px-3 py-1 whitespace-nowrap transition-colors"
                onClick={onDone}
              >
                Stop
              </button>
            </>
          ) : null}
          {phase === 'scroll' && onDone && !finishing ? (
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
          {phase === 'recording' ? 'Screen recording' : 'Scrolling capture'}
        </p>
        <p className="mt-1 text-lg font-medium text-white">{label}</p>
      </div>
    </div>
  );
}

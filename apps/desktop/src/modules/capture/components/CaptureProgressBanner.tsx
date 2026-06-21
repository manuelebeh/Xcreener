import { useCaptureStore } from '../store';

export function CaptureProgressBanner() {
  const progress = useCaptureStore((s) => s.captureProgress);

  if (!progress || progress.phase === 'scroll' || progress.phase === 'recording') {
    return null;
  }

  const label = progress.remainingSecs
    ? `Capturing in ${progress.remainingSecs}s`
    : 'Capture in progress...';

  return (
    <div
      data-testid="capture-session-progress"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="capture-hud flex items-center gap-3 rounded-full border px-4 py-2 text-sm shadow-lg">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"
          aria-hidden="true"
        />
        <span className="whitespace-nowrap">{label}</span>
      </div>
    </div>
  );
}

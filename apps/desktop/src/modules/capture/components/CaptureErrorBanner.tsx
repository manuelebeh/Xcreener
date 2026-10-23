import { useCaptureStore } from '../store';

export function CaptureErrorBanner() {
  const error = useCaptureStore((s) => s.error);
  const setError = useCaptureStore((s) => s.setError);

  if (!error) {
    return null;
  }

  return (
    <div
      className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
      role="alert"
      data-testid="capture-session-error"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
        <p className="min-w-0">{error}</p>
        <button
          type="button"
          className="sg-focus-ring shrink-0 rounded-sm text-xs font-medium text-muted underline-offset-2 hover:underline"
          onClick={() => setError(null)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

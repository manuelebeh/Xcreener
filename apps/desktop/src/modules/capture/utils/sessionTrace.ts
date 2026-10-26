const MAX_STEPS = 50;
const steps: string[] = [];
const startedAt = Date.now();

/** Records where the capture hand-off got to, so native E2E failures name the step that never finished. */
export function traceCapture(step: string): void {
  if (steps.length < MAX_STEPS) {
    steps.push(`+${Date.now() - startedAt}ms ${step}`);
  }
}

export function getCaptureTrace(): string[] {
  return [...steps];
}

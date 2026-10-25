/** Zoom stops for the preview view, as a fraction of the export size. */
export const VIEW_ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** Next stop above (`in`) or below (`out`) the current on-screen scale, or null at the end. */
export function stepViewZoom(current: number, direction: 'in' | 'out'): number | null {
  const epsilon = 0.001;
  if (direction === 'in') {
    return VIEW_ZOOM_STEPS.find((step) => step > current + epsilon) ?? null;
  }
  return [...VIEW_ZOOM_STEPS].reverse().find((step) => step < current - epsilon) ?? null;
}

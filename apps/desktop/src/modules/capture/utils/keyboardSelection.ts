import type { Rect, WindowInfo } from '@/shared/types/ipc';
import type { OverlayViewport } from '../overlayCoordinates';

/** Same floor as a pointer selection in RegionSelector. */
const MIN_SIZE = 4;

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
}

/** Starting point for keyboard users: a centered rectangle half the viewport size. */
export function defaultSelection(viewport: OverlayViewport): Rect {
  const width = Math.round(viewport.width / 2);
  const height = Math.round(viewport.height / 2);
  return {
    x: Math.round((viewport.width - width) / 2),
    y: Math.round((viewport.height - height) / 2),
    width,
    height,
  };
}

/**
 * Arrow moves the selection, Alt+Arrow resizes it from the bottom-right corner.
 * Shift makes the step 10 px. The result stays inside the viewport.
 */
export function nudgeSelection(
  rect: Rect,
  key: ArrowKey,
  modifiers: { shift: boolean; alt: boolean },
  viewport: OverlayViewport
): Rect {
  const step = modifiers.shift ? 10 : 1;
  const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
  const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;

  if (modifiers.alt) {
    return {
      ...rect,
      width: Math.min(Math.max(rect.width + dx, MIN_SIZE), viewport.width - rect.x),
      height: Math.min(Math.max(rect.height + dy, MIN_SIZE), viewport.height - rect.y),
    };
  }

  return {
    ...rect,
    x: Math.min(Math.max(rect.x + dx, 0), Math.max(viewport.width - rect.width, 0)),
    y: Math.min(Math.max(rect.y + dy, 0), Math.max(viewport.height - rect.height, 0)),
  };
}

/**
 * Next window for Tab (previous for Shift+Tab), topmost first. `windows` is in
 * `list_windows` order, where the last entry is the topmost window.
 * Returns null past either end so focus can leave the overlay surface.
 */
export function nextWindow(
  windows: WindowInfo[],
  currentId: number | null,
  reverse: boolean
): WindowInfo | null {
  const ordered = [...windows].reverse();
  if (ordered.length === 0) {
    return null;
  }
  const index = currentId === null ? -1 : ordered.findIndex((w) => w.id === currentId);
  if (index === -1) {
    return (reverse ? ordered.at(-1) : ordered[0]) ?? null;
  }
  return ordered[reverse ? index - 1 : index + 1] ?? null;
}

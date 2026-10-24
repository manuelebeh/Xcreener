import { describe, expect, it } from 'vitest';
import type { WindowInfo } from '@/shared/types/ipc';
import { defaultSelection, nextWindow, nudgeSelection } from './keyboardSelection';

const viewport = { width: 1000, height: 800 };
const none = { shift: false, alt: false };

describe('defaultSelection', () => {
  it('centers a half-size rectangle', () => {
    expect(defaultSelection(viewport)).toEqual({ x: 250, y: 200, width: 500, height: 400 });
  });
});

describe('nudgeSelection', () => {
  const rect = { x: 100, y: 100, width: 200, height: 150 };

  it('moves by 1 px, or 10 px with Shift', () => {
    expect(nudgeSelection(rect, 'ArrowRight', none, viewport)).toMatchObject({ x: 101, y: 100 });
    expect(nudgeSelection(rect, 'ArrowUp', { shift: true, alt: false }, viewport)).toMatchObject({
      x: 100,
      y: 90,
    });
  });

  it('keeps the selection inside the viewport', () => {
    expect(nudgeSelection({ ...rect, x: 0 }, 'ArrowLeft', none, viewport).x).toBe(0);
    expect(
      nudgeSelection({ ...rect, x: 795 }, 'ArrowRight', { shift: true, alt: false }, viewport).x
    ).toBe(800);
  });

  it('resizes with Alt without going below 4 px or past the edge', () => {
    const alt = { shift: false, alt: true };
    expect(nudgeSelection(rect, 'ArrowRight', alt, viewport)).toEqual({ ...rect, width: 201 });
    expect(nudgeSelection({ ...rect, height: 4 }, 'ArrowUp', alt, viewport).height).toBe(4);
    expect(nudgeSelection({ ...rect, x: 600, width: 400 }, 'ArrowRight', alt, viewport).width).toBe(
      400
    );
  });
});

describe('nextWindow', () => {
  const win = (id: number): WindowInfo => ({
    id,
    title: `w${id}`,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  // list_windows order: last entry is the topmost window.
  const windows = [win(1), win(2), win(3)];

  it('starts at the topmost window, or the bottom one with Shift+Tab', () => {
    expect(nextWindow(windows, null, false)?.id).toBe(3);
    expect(nextWindow(windows, null, true)?.id).toBe(1);
  });

  it('walks down the stack and returns null past the end', () => {
    expect(nextWindow(windows, 3, false)?.id).toBe(2);
    expect(nextWindow(windows, 1, false)).toBeNull();
    expect(nextWindow(windows, 3, true)).toBeNull();
  });

  it('returns null with no windows', () => {
    expect(nextWindow([], null, false)).toBeNull();
  });
});

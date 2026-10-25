import type { Annotation } from '@snapglow/editor-core';
import { describe, expect, it, vi } from 'vitest';
import { drawBlurMasks } from './drawBlurMasks';

describe('drawBlurMasks solid mode', () => {
  it('fills the device-pixel rect with the color, ignoring the pixel-ratio transform', () => {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    };
    const annotation: Annotation = {
      type: 'blur',
      id: 'a',
      x: 10,
      y: 20,
      width: 30,
      height: 5,
      mode: 'solid',
      intensity: 12,
      color: '#ff0000',
    };

    drawBlurMasks(ctx as unknown as CanvasRenderingContext2D, [annotation], 200, 100, 2);

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
    expect(ctx.fillRect).toHaveBeenCalledWith(20, 40, 60, 10);
    expect(ctx.fillStyle).toBe('#ff0000');
  });
});

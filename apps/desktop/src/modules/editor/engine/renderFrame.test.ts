import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHADOW } from '../store';
import type { RenderInput } from '../types';
import { DEFAULT_GRADIENT_PRESET_ID } from './gradients';
import { renderFrame } from './renderFrame';

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return { width, height } as ImageBitmap;
}

function baseInput(overrides: Partial<RenderInput> = {}): RenderInput {
  return {
    screenshot: createMockScreenshot(100, 80),
    background: { type: 'gradient', presetId: DEFAULT_GRADIENT_PRESET_ID },
    padding: 20,
    borderRadius: 8,
    shadow: DEFAULT_SHADOW,
    ...overrides,
  };
}

function createMockContext(): CanvasRenderingContext2D {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '',
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('renderFrame', () => {
  it('composes background, shadow, and screenshot layers', () => {
    const ctx = createMockContext();
    const input = baseInput();

    const { layout } = renderFrame(ctx, input, 1);

    expect(layout).toEqual({
      canvasWidth: 140,
      canvasHeight: 120,
      screenshot: { x: 20, y: 20, width: 100, height: 80 },
    });
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(input.screenshot, 20, 20, 100, 80);
  });
});

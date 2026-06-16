import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHADOW } from '../store';
import type { RenderInput } from '../types';
import { DEFAULT_TRANSFORM } from '../types';
import { DEFAULT_GRADIENT_PRESET_ID } from './gradients';
import { getPresetById } from './presets';
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
    frame: null,
    transform: DEFAULT_TRANSFORM,
    annotations: [],
    selectedAnnotationId: null,
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
    strokeRect: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('renderFrame', () => {
  it('composes background, shadow, and screenshot layers in free mode', () => {
    const ctx = createMockContext();
    const input = baseInput();

    const { layout } = renderFrame(ctx, input, 1);

    expect(layout).toEqual({
      canvasWidth: 140,
      canvasHeight: 120,
      content: { x: 20, y: 20, width: 100, height: 80 },
      screenshot: { x: 20, y: 20, width: 100, height: 80 },
    });
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(input.screenshot, 0, 0, 100, 80, 20, 20, 100, 80);
  });

  it('renders framed preset with 9-arg drawImage', () => {
    const ctx = createMockContext();
    const frame = getPresetById('instagram');
    const input = baseInput({ frame, padding: 40 });

    const { layout } = renderFrame(ctx, input, 1);

    expect(layout.canvasWidth).toBe(1080);
    expect(layout.canvasHeight).toBe(1080);
    expect(ctx.drawImage).toHaveBeenCalled();
    const drawCall = vi.mocked(ctx.drawImage).mock.calls[0];
    expect(drawCall).toHaveLength(9);
  });

  it('draws annotations after screenshot layer', () => {
    const ctx = createMockContext();
    const input = baseInput({
      annotations: [
        {
          type: 'rect',
          id: 'rect-1',
          x: 5,
          y: 5,
          width: 20,
          height: 10,
          stroke: '#ff0000',
          strokeWidth: 2,
          fill: null,
        },
      ],
      selectedAnnotationId: 'rect-1',
    });

    renderFrame(ctx, input, 1);

    expect(ctx.strokeRect).toHaveBeenCalled();
  });
});

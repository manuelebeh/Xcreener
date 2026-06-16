import { describe, expect, it, vi } from 'vitest';
import { drawBackground } from './drawBackground';

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  } as unknown as CanvasRenderingContext2D;
}

describe('drawBackground', () => {
  it('draws an uploaded image background in cover mode', () => {
    const ctx = createMockContext();
    const image = { width: 1920, height: 1080 } as ImageBitmap;

    drawBackground(ctx, { type: 'image', source: image }, 400, 300);

    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    const [drawnImage, x, y, width, height] = vi.mocked(ctx.drawImage).mock.calls[0] ?? [];
    expect(drawnImage).toBe(image);
    expect(width).toBeGreaterThan(400);
    expect(height).toBe(300);
    expect(x).toBeLessThan(0);
    expect(y).toBe(0);
  });
});

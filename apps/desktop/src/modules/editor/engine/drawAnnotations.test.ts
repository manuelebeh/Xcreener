import { describe, expect, it, vi } from 'vitest';
import type { RectAnnotation } from '../annotations/types';
import { drawAnnotations } from './drawAnnotations';

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

describe('drawAnnotations', () => {
  it('draws rectangle and highlight annotations', () => {
    const ctx = createMockContext();
    const rect: RectAnnotation = {
      type: 'rect',
      id: 'rect-1',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      stroke: '#ff0000',
      strokeWidth: 2,
      fill: null,
    };

    drawAnnotations(ctx, [
      rect,
      {
        type: 'highlight',
        id: 'hl-1',
        x: 5,
        y: 5,
        width: 30,
        height: 20,
        color: '#ffff00',
        opacity: 0.4,
      },
    ]);

    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 100, 50);
    expect(ctx.fillRect).toHaveBeenCalledWith(5, 5, 30, 20);
  });
});

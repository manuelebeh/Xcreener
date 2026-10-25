import { describe, expect, it } from 'vitest';
import { DEFAULT_WATERMARK, type WatermarkPosition } from './types';
import { computeWatermarkBox, watermarkLabel } from './watermark';

describe('watermark geometry', () => {
  it('joins name and url', () => {
    expect(watermarkLabel(DEFAULT_WATERMARK)).toBe('Xcreener');
    expect(watermarkLabel({ ...DEFAULT_WATERMARK, url: 'xcreener.app' })).toBe(
      'Xcreener · xcreener.app'
    );
  });

  it.each([
    ['top-left', 16, 16],
    ['top-right', 1000 - 132 - 16, 16],
    ['bottom-left', 16, 600 - 50 - 16],
    ['bottom-right', 1000 - 132 - 16, 600 - 50 - 16],
  ] as const)('places a text-only badge %s like drawWatermark', (position, x, y) => {
    const box = computeWatermarkBox(
      { ...DEFAULT_WATERMARK, position: position as WatermarkPosition },
      1000,
      600,
      100,
      false
    );
    // width = text 100 + padding 2×16; height = max(0, 18) + 2×16.
    expect(box).toEqual({ x, y, width: 132, height: 50, textX: x + 16, centerY: y + 25 });
  });

  it('makes room for a logo', () => {
    const box = computeWatermarkBox(DEFAULT_WATERMARK, 1000, 600, 100, true);
    // width = logo 28 + gap 8 + text 100 + 2×16; height = 28 + 2×16.
    expect(box.width).toBe(168);
    expect(box.height).toBe(60);
    expect(box.textX).toBe(box.x + 16 + 28 + 8);
  });
});

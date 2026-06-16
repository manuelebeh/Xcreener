import { describe, expect, it } from 'vitest';
import { fitPreviewSize } from './fitPreviewSize';

describe('fitPreviewSize', () => {
  it('preserves aspect ratio when fitting a square into a wide box', () => {
    const size = fitPreviewSize(1080, 1080, 800, 400);
    expect(size.width).toBe(400);
    expect(size.height).toBe(400);
  });

  it('preserves 16:9 when fitting into a square box', () => {
    const size = fitPreviewSize(1280, 720, 500, 500);
    expect(size.width).toBe(500);
    expect(size.height).toBe(281);
  });
});

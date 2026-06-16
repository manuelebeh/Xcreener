import { describe, expect, it } from 'vitest';
import { computeThumbnailSize } from './thumbnail';

describe('computeThumbnailSize', () => {
  it('scales down large landscape images', () => {
    expect(computeThumbnailSize(1600, 900)).toEqual({ width: 200, height: 113 });
  });

  it('scales down large portrait images', () => {
    expect(computeThumbnailSize(900, 1600)).toEqual({ width: 113, height: 200 });
  });

  it('keeps small images unchanged', () => {
    expect(computeThumbnailSize(120, 80)).toEqual({ width: 120, height: 80 });
  });
});

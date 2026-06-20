import { describe, expect, it } from 'vitest';

import { fitGpuTextureSize, MAX_GPU_TEXTURE_SIZE } from './fitPreviewSize';

describe('fitGpuTextureSize', () => {
  it('caps logical size by pixel ratio so physical texture stays within Metal limit', () => {
    const size = fitGpuTextureSize(12816, 9792, MAX_GPU_TEXTURE_SIZE, 3);

    expect(size.width * 3).toBeLessThanOrEqual(MAX_GPU_TEXTURE_SIZE);
    expect(size.height * 3).toBeLessThanOrEqual(MAX_GPU_TEXTURE_SIZE);
  });

  it('preserves aspect ratio when downscaling', () => {
    const size = fitGpuTextureSize(12816, 9792, MAX_GPU_TEXTURE_SIZE, 3);
    const originalRatio = 12816 / 9792;
    const cappedRatio = size.width / size.height;

    expect(cappedRatio).toBeCloseTo(originalRatio, 2);
  });
});

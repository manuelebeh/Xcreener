import { describe, expect, it } from 'vitest';
import { getImageDimensionsFromPng } from './image';

describe('getImageDimensionsFromPng', () => {
  it('reads width and height from the PNG IHDR chunk', () => {
    const bytes = new Array<number>(24).fill(0);
    bytes[16] = 0;
    bytes[17] = 0;
    bytes[18] = 1;
    bytes[19] = 44;
    bytes[20] = 0;
    bytes[21] = 0;
    bytes[22] = 0;
    bytes[23] = 96;

    expect(getImageDimensionsFromPng(bytes)).toEqual({ width: 300, height: 96 });
  });

  it('returns null for invalid payloads', () => {
    expect(getImageDimensionsFromPng([1, 2, 3])).toBeNull();
  });
});

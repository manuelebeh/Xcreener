import { describe, expect, it } from 'vitest';
import { gaussianBlurImageData, pixelateImageData } from './drawBlurMasks';

describe('pixelateImageData', () => {
  it('averages pixels inside blocks', () => {
    const imageData = {
      data: new Uint8ClampedArray(64),
      width: 4,
      height: 4,
    } as ImageData;
    for (let index = 0; index < imageData.data.length; index += 4) {
      imageData.data[index] = 255;
      imageData.data[index + 1] = 0;
      imageData.data[index + 2] = 0;
      imageData.data[index + 3] = 255;
    }

    pixelateImageData(imageData, 2);

    expect(imageData.data[0]).toBe(255);
    expect(imageData.data[1]).toBe(0);
    expect(imageData.data[4]).toBe(255);
  });
});

describe('gaussianBlurImageData', () => {
  it('softens pixel values in the region', () => {
    const imageData = {
      data: new Uint8ClampedArray(64),
      width: 4,
      height: 4,
    } as ImageData;

    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const index = (y * 4 + x) * 4;
        const center = x === 2 && y === 2;
        imageData.data[index] = center ? 255 : 0;
        imageData.data[index + 1] = center ? 255 : 0;
        imageData.data[index + 2] = center ? 255 : 0;
        imageData.data[index + 3] = 255;
      }
    }

    gaussianBlurImageData(imageData, 1);

    const neighborIndex = (1 * 4 + 2) * 4;
    expect(imageData.data[neighborIndex]).toBeGreaterThan(0);
    expect(imageData.data[neighborIndex]).toBeLessThan(255);
  });
});

/** DOM ImageData-compatible buffer (avoids requiring DOM lib in every consumer). */
export interface PixelImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function pixelateImageData(imageData: PixelImageData, blockSize: number): void {
  const { data, width, height } = imageData;
  const size = Math.max(2, Math.floor(blockSize));

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;

      for (let dy = 0; dy < size && y + dy < height; dy += 1) {
        for (let dx = 0; dx < size && x + dx < width; dx += 1) {
          const index = ((y + dy) * width + (x + dx)) * 4;
          r += data[index] ?? 0;
          g += data[index + 1] ?? 0;
          b += data[index + 2] ?? 0;
          a += data[index + 3] ?? 0;
          count += 1;
        }
      }

      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);
      const avgA = Math.round(a / count);

      for (let dy = 0; dy < size && y + dy < height; dy += 1) {
        for (let dx = 0; dx < size && x + dx < width; dx += 1) {
          const index = ((y + dy) * width + (x + dx)) * 4;
          data[index] = avgR;
          data[index + 1] = avgG;
          data[index + 2] = avgB;
          data[index + 3] = avgA;
        }
      }
    }
  }
}

function boxBlurHorizontal(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): void {
  const diameter = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;

    for (let channel = 0; channel < 4; channel += 1) {
      let sum = 0;

      for (let x = -radius; x <= radius; x += 1) {
        const clampedX = Math.min(width - 1, Math.max(0, x));
        sum += source[rowOffset + clampedX * 4 + channel] ?? 0;
      }

      for (let x = 0; x < width; x += 1) {
        target[rowOffset + x * 4 + channel] = Math.round(sum / diameter);
        const removeX = Math.max(0, x - radius);
        const addX = Math.min(width - 1, x + radius + 1);
        sum +=
          (source[rowOffset + addX * 4 + channel] ?? 0) -
          (source[rowOffset + removeX * 4 + channel] ?? 0);
      }
    }
  }
}

function boxBlurVertical(
  source: Uint8ClampedArray,
  target: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): void {
  const diameter = radius * 2 + 1;

  for (let x = 0; x < width; x += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      let sum = 0;

      for (let y = -radius; y <= radius; y += 1) {
        const clampedY = Math.min(height - 1, Math.max(0, y));
        sum += source[(clampedY * width + x) * 4 + channel] ?? 0;
      }

      for (let y = 0; y < height; y += 1) {
        target[(y * width + x) * 4 + channel] = Math.round(sum / diameter);
        const removeY = Math.max(0, y - radius);
        const addY = Math.min(height - 1, y + radius + 1);
        sum +=
          (source[(addY * width + x) * 4 + channel] ?? 0) -
          (source[(removeY * width + x) * 4 + channel] ?? 0);
      }
    }
  }
}

function boxBlurPass(
  source: Uint8ClampedArray,
  temp: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  boxBlurHorizontal(source, temp, width, height, radius);
  boxBlurVertical(temp, source, width, height, radius);
  return source;
}

/** Approximate Gaussian blur via 3 box-blur passes (no Canvas filter API). */
export function gaussianBlurImageData(imageData: PixelImageData, radius: number): void {
  const { width, height } = imageData;
  if (width <= 0 || height <= 0) {
    return;
  }

  const r = Math.max(1, Math.min(64, Math.floor(radius)));
  const src = new Uint8ClampedArray(imageData.data);
  const tmp = new Uint8ClampedArray(src.length);

  boxBlurPass(src, tmp, width, height, r);
  boxBlurPass(src, tmp, width, height, r);
  boxBlurPass(src, tmp, width, height, r);

  imageData.data.set(src);
}

export function clampBlurRect(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(canvasWidth, Math.ceil(x + width));
  const bottom = Math.min(canvasHeight, Math.ceil(y + height));

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

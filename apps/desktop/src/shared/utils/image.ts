export function bytesToObjectUrl(bytes: number[], mimeType = 'image/png'): string {
  const uint8 = new Uint8Array(bytes);
  const blob = new Blob([uint8], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function bytesToImageBitmap(bytes: number[]): Promise<ImageBitmap> {
  const uint8 = new Uint8Array(bytes);
  const blob = new Blob([uint8], { type: 'image/png' });
  return createImageBitmap(blob);
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load preview image'));
    image.src = objectUrl;
  });
}

export async function cropObjectUrlToPngBytes(
  objectUrl: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<{ bytes: number[]; width: number; height: number }> {
  const image = await loadImage(objectUrl);
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }

  context.drawImage(image, x, y, width, height, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) {
        resolve(value);
        return;
      }
      reject(new Error('Failed to encode cropped image'));
    }, 'image/png');
  });

  const buffer = await blob.arrayBuffer();
  return {
    bytes: Array.from(new Uint8Array(buffer)),
    width,
    height,
  };
}

export function getImageDimensionsFromPng(
  bytes: number[]
): { width: number; height: number } | null {
  if (bytes.length < 24) {
    return null;
  }

  const width =
    ((bytes[16] ?? 0) << 24) |
    ((bytes[17] ?? 0) << 16) |
    ((bytes[18] ?? 0) << 8) |
    (bytes[19] ?? 0);
  const height =
    ((bytes[20] ?? 0) << 24) |
    ((bytes[21] ?? 0) << 16) |
    ((bytes[22] ?? 0) << 8) |
    (bytes[23] ?? 0);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

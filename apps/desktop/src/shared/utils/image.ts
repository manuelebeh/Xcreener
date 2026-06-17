export function bytesToBlob(bytes: Uint8Array | number[], mimeType = 'image/png'): Blob {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return new Blob([uint8], { type: mimeType });
}

export function bytesToObjectUrl(bytes: Uint8Array | number[], mimeType = 'image/png'): string {
  return URL.createObjectURL(bytesToBlob(bytes, mimeType));
}

/** Fast path for live capture IPC bytes — works reliably with canvas drawImage in Tauri. */
export async function bytesToImageBitmap(bytes: Uint8Array | number[]): Promise<ImageBitmap> {
  return createImageBitmap(bytesToBlob(bytes, 'image/png'));
}

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load preview image'));
    image.src = objectUrl;
  });
}

/**
 * Decode PNG bytes via an intermediate canvas.
 * Required when reopening from disk — direct createImageBitmap(blob) can yield
 * empty bitmaps in WKWebView while still reporting correct dimensions.
 */
export async function decodePngBytesToBitmap(bytes: Uint8Array | number[]): Promise<ImageBitmap> {
  const blob = bytesToBlob(bytes, 'image/png');

  try {
    const direct = await createImageBitmap(blob);
    if (direct.width > 0 && direct.height > 0) {
      return direct;
    }
    direct.close();
  } catch {
    // Fall through to canvas decode.
  }

  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported');
    }

    context.drawImage(image, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function cropObjectUrlToPngBytes(
  objectUrl: string,
  rect: { x: number; y: number; width: number; height: number },
  displaySize?: { width: number; height: number }
): Promise<{ bytes: number[]; width: number; height: number }> {
  const image = await loadImage(objectUrl);
  const displayWidth = displaySize?.width ?? image.width;
  const displayHeight = displaySize?.height ?? image.height;
  const scaleX = image.naturalWidth / displayWidth;
  const scaleY = image.naturalHeight / displayHeight;
  const sourceX = Math.round(rect.x * scaleX);
  const sourceY = Math.round(rect.y * scaleY);
  const sourceWidth = Math.round(rect.width * scaleX);
  const sourceHeight = Math.round(rect.height * scaleY);

  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );

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
    width: sourceWidth,
    height: sourceHeight,
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

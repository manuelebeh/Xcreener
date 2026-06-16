const MAX_THUMB_EDGE = 200;

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToWebpBytes(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Uint8Array> {
  const blob =
    canvas instanceof OffscreenCanvas
      ? await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
      : await new Promise<Blob>((resolve, reject) => {
          (canvas as HTMLCanvasElement).toBlob(
            (value) => {
              if (value) {
                resolve(value);
                return;
              }
              reject(new Error('Failed to encode thumbnail'));
            },
            'image/webp',
            0.82
          );
        });

  return new Uint8Array(await blob.arrayBuffer());
}

export function computeThumbnailSize(
  width: number,
  height: number,
  maxEdge = MAX_THUMB_EDGE
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function generateThumbnailBytes(
  pngBytes: Uint8Array,
  width: number,
  height: number
): Promise<Uint8Array> {
  const blob = new Blob([pngBytes], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);
  const thumbSize = computeThumbnailSize(width, height);

  const canvas = createCanvas(thumbSize.width, thumbSize.height);
  const context = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) {
    bitmap.close();
    throw new Error('Canvas is not supported');
  }

  context.drawImage(bitmap, 0, 0, thumbSize.width, thumbSize.height);
  bitmap.close();

  return canvasToWebpBytes(canvas);
}

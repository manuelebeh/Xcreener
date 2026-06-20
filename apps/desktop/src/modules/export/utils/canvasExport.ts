import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { renderFrame } from '@/modules/editor/engine/renderFrame';
import type { RenderInput } from '@/modules/editor/types';
import { useSettingsStore } from '@/modules/settings/store';
import type { ExportFormat } from './formats';
import { maybeCompressExportBlob } from './smartCompression';

export type ExportCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createExportCanvas(width: number, height: number): ExportCanvas {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  throw new Error('No canvas implementation available');
}

const MIME_TYPES: Record<ExportFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

function qualityToMimeQuality(format: ExportFormat, quality: number): number | undefined {
  if (format === 'png') {
    return undefined;
  }
  return Math.min(1, Math.max(0, quality / 100));
}

export function canvasToBlob(
  canvas: ExportCanvas,
  format: ExportFormat,
  quality = 100
): Promise<Blob> {
  const mimeType = MIME_TYPES[format];
  const mimeQuality = qualityToMimeQuality(format, quality);

  if (typeof (canvas as HTMLCanvasElement).toBlob === 'function') {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (blob: Blob | null) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to export canvas to ${format.toUpperCase()}`));
          }
        },
        mimeType,
        mimeQuality
      );
    });
  }

  if (
    typeof OffscreenCanvas !== 'undefined' &&
    canvas instanceof OffscreenCanvas &&
    typeof canvas.convertToBlob === 'function'
  ) {
    return canvas.convertToBlob({ type: mimeType, quality: mimeQuality });
  }

  if (typeof document !== 'undefined') {
    const fallback = createExportCanvas(canvas.width, canvas.height);
    const ctx = fallback.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context for export encoding');
    }
    ctx.drawImage(canvas, 0, 0);
    return canvasToBlob(fallback, format, quality);
  }

  return Promise.reject(
    new Error(`Canvas blob encoding is not supported for ${format.toUpperCase()}`)
  );
}

export function canvasToPngBlob(canvas: ExportCanvas): Promise<Blob> {
  return canvasToBlob(canvas, 'png', 100);
}

export function getCanvasExportDimensions(canvas: ExportCanvas): {
  width: number;
  height: number;
} {
  return {
    width: canvas.width,
    height: canvas.height,
  };
}

export function renderToExportCanvas(input: RenderInput): {
  canvas: ExportCanvas;
  width: number;
  height: number;
} {
  const exportInput: RenderInput = { ...input, selectedAnnotationId: null };
  const layout = computeLayout(exportInput);

  const canvas = createExportCanvas(layout.canvasWidth, layout.canvasHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context for export');
  }

  renderFrame(ctx as CanvasRenderingContext2D, exportInput, 1, canvas);

  return {
    canvas,
    width: layout.canvasWidth,
    height: layout.canvasHeight,
  };
}

export async function exportRenderInput(
  input: RenderInput,
  format: ExportFormat,
  quality = 100
): Promise<{ blob: Blob; width: number; height: number; compressionPercent: number | null }> {
  const { canvas, width, height } = renderToExportCanvas(input);
  const blob = await canvasToBlob(canvas, format, quality);
  const smartCompression = useSettingsStore.getState().smartCompression;
  const compressed = await maybeCompressExportBlob(blob, format, quality, smartCompression);
  return {
    blob: compressed.blob,
    width,
    height,
    compressionPercent: compressed.compressionPercent,
  };
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load exported image'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

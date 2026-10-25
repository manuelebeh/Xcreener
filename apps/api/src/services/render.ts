import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  defaultExportQuality,
  type ExportFormat,
  MAX_RENDER_PIXELS,
  mimeTypeForExportFormat,
} from '@xcreener/api-core';
import type { CollabDocumentState } from '@xcreener/collab-core';
import { DEFAULT_WATERMARK, type WatermarkConfig } from '@xcreener/editor-core';
import type { RenderScreenshotSource } from '@xcreener/render-core';
import { computeLayout, documentStateToRenderInput, renderFrame } from '@xcreener/render-core';
import type { BrandKitWatermark } from '@xcreener/team-core';
import type { StorageService } from './storage';

export interface RenderExportOptions {
  documentState: CollabDocumentState;
  screenshotBuffer: Buffer;
  format: ExportFormat;
  quality?: number;
  brandKitWatermark?: BrandKitWatermark | null;
  brandKitLogoBuffer?: Buffer | null;
}

/** Thrown before allocating a canvas over the pixel budget. Fastify answers with `statusCode`. */
export class RenderTooLargeError extends Error {
  readonly statusCode = 413;

  constructor() {
    super('Export is too large to render');
  }
}

export interface RenderExportResult {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
}

function brandKitToWatermark(
  watermark: BrandKitWatermark | null | undefined
): WatermarkConfig | undefined {
  if (!watermark?.enabled) {
    return undefined;
  }

  return {
    enabled: true,
    displayName: watermark.displayName ?? DEFAULT_WATERMARK.displayName,
    url: watermark.url ?? null,
    position: watermark.position ?? DEFAULT_WATERMARK.position,
    opacity: watermark.opacity ?? DEFAULT_WATERMARK.opacity,
  };
}

export async function renderCaptureExport(
  options: RenderExportOptions
): Promise<RenderExportResult> {
  const screenshotImage = await loadImage(options.screenshotBuffer);
  const watermark = brandKitToWatermark(options.brandKitWatermark);
  let watermarkLogo: Awaited<ReturnType<typeof loadImage>> | null = null;

  if (options.brandKitLogoBuffer) {
    watermarkLogo = await loadImage(options.brandKitLogoBuffer);
  }

  const renderInput = documentStateToRenderInput(
    options.documentState,
    screenshotImage as unknown as RenderScreenshotSource,
    {
      watermark,
      watermarkLogo: watermarkLogo as unknown as CanvasImageSource | null,
    }
  );

  const layout = computeLayout(renderInput);
  if (layout.canvasWidth * layout.canvasHeight > MAX_RENDER_PIXELS) {
    throw new RenderTooLargeError();
  }

  const canvas = createCanvas(layout.canvasWidth, layout.canvasHeight);
  const ctx = canvas.getContext('2d');
  renderFrame(
    ctx as unknown as CanvasRenderingContext2D,
    renderInput,
    1,
    canvas as unknown as HTMLCanvasElement,
    watermarkLogo as unknown as CanvasImageSource | null
  );

  const quality = options.quality ?? defaultExportQuality(options.format);
  const mimeType = mimeTypeForExportFormat(options.format);

  let buffer: Buffer;
  if (options.format === 'png') {
    buffer = canvas.toBuffer('image/png');
  } else if (options.format === 'jpg') {
    buffer = canvas.toBuffer('image/jpeg', quality);
  } else {
    buffer = canvas.toBuffer('image/webp', quality);
  }

  return {
    buffer,
    width: layout.canvasWidth,
    height: layout.canvasHeight,
    mimeType,
  };
}

export async function loadBrandKitLogo(
  storage: StorageService,
  logoStorageKey: string | null | undefined
): Promise<Buffer | null> {
  if (!logoStorageKey) {
    return null;
  }
  try {
    return await storage.getObject(logoStorageKey);
  } catch {
    return null;
  }
}

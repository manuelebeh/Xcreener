import { canvasToPngBlob, createExportCanvas } from '@/modules/export/utils/canvasExport';

export async function screenshotToPngBytes(screenshot: ImageBitmap): Promise<Uint8Array> {
  const canvas = createExportCanvas(screenshot.width, screenshot.height);

  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    throw new Error('Failed to create screenshot export context');
  }

  ctx.drawImage(screenshot, 0, 0);
  const blob = await canvasToPngBlob(canvas);
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

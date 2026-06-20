const BLUR_MAX_SIZE = 512;
const BLUR_RADIUS = 24;

export async function createBlurredScreenshotBackground(
  screenshot: ImageBitmap
): Promise<ImageBitmap> {
  const scale = Math.min(1, BLUR_MAX_SIZE / Math.max(screenshot.width, screenshot.height));
  const width = Math.max(1, Math.round(screenshot.width * scale));
  const height = Math.max(1, Math.round(screenshot.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create blur canvas context');
  }

  ctx.filter = `blur(${BLUR_RADIUS}px)`;
  ctx.drawImage(screenshot, 0, 0, width, height);

  return createImageBitmap(canvas);
}

export function fitPreviewSize(
  contentWidth: number,
  contentHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (contentWidth <= 0 || contentHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(maxWidth / contentWidth, maxHeight / contentHeight);

  return {
    width: Math.max(1, Math.floor(contentWidth * scale)),
    height: Math.max(1, Math.floor(contentHeight * scale)),
  };
}

/** iOS Metal / common GPU max texture dimension (Skia snapshot limit). */
export const MAX_GPU_TEXTURE_SIZE = 8192;

export function fitGpuTextureSize(
  contentWidth: number,
  contentHeight: number,
  maxPhysicalSize: number = MAX_GPU_TEXTURE_SIZE,
  pixelRatio = 1
): { width: number; height: number } {
  const safeRatio = Math.max(1, pixelRatio);
  const maxLogicalSize = Math.floor(maxPhysicalSize / safeRatio);
  return fitPreviewSize(contentWidth, contentHeight, maxLogicalSize, maxLogicalSize);
}

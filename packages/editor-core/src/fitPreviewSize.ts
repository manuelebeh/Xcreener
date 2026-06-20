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

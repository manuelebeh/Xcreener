export function logicalCanvasPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  layoutWidth: number,
  layoutHeight: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * layoutWidth,
    y: ((clientY - rect.top) / rect.height) * layoutHeight,
  };
}

export function displayToLayoutScale(canvas: HTMLCanvasElement, layoutWidth: number): number {
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 ? layoutWidth / rect.width : 1;
}

export function touchToLayout(
  locationX: number,
  locationY: number,
  displayWidth: number,
  layoutWidth: number
): { x: number; y: number } {
  const scale = displayWidth > 0 && layoutWidth > 0 ? displayWidth / layoutWidth : 1;
  return {
    x: locationX / scale,
    y: locationY / scale,
  };
}

export function displayScale(displayWidth: number, layoutWidth: number): number {
  return displayWidth > 0 && layoutWidth > 0 ? displayWidth / layoutWidth : 1;
}

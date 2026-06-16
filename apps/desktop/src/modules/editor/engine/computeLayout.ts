import type { ComputedLayout, RenderInput } from '../types';

const MIN_PADDING = 24;
const MAX_PADDING = 120;
const PADDING_RATIO = 0.12;

export function autoPadding(screenshot: ImageBitmap): number {
  const largestSide = Math.max(screenshot.width, screenshot.height);
  return Math.round(Math.min(MAX_PADDING, Math.max(MIN_PADDING, largestSide * PADDING_RATIO)));
}

export function computeLayout(input: RenderInput): ComputedLayout {
  const { screenshot, padding } = input;
  const canvasWidth = screenshot.width + padding * 2;
  const canvasHeight = screenshot.height + padding * 2;

  return {
    canvasWidth,
    canvasHeight,
    screenshot: {
      x: padding,
      y: padding,
      width: screenshot.width,
      height: screenshot.height,
    },
  };
}

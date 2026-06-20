import type {
  ComputedLayout,
  LayoutRect,
  RenderInput,
  ScreenshotDimensions,
  ScreenshotTransform,
} from './types';

export function zoomTransformAtPointer(
  layout: ComputedLayout,
  transform: ScreenshotTransform,
  pointerX: number,
  pointerY: number,
  nextScale: number
): ScreenshotTransform {
  const { content } = layout;
  const centerX = content.x + content.width / 2;
  const centerY = content.y + content.height / 2;
  const current = layout.screenshot;

  if (current.width <= 0 || current.height <= 0 || transform.scale <= 0) {
    return { ...transform, scale: nextScale };
  }

  const baseWidth = current.width / transform.scale;
  const baseHeight = current.height / transform.scale;
  const nextWidth = baseWidth * nextScale;
  const nextHeight = baseHeight * nextScale;

  const focusX = Math.min(1, Math.max(0, (pointerX - current.x) / current.width));
  const focusY = Math.min(1, Math.max(0, (pointerY - current.y) / current.height));

  return {
    scale: nextScale,
    offsetX: pointerX - focusX * nextWidth + nextWidth / 2 - centerX,
    offsetY: pointerY - focusY * nextHeight + nextHeight / 2 - centerY,
  };
}

const MIN_PADDING = 24;
const MAX_PADDING = 120;
const PADDING_RATIO = 0.12;

export function autoPadding(screenshot: ScreenshotDimensions): number {
  const largestSide = Math.max(screenshot.width, screenshot.height);
  return Math.round(Math.min(MAX_PADDING, Math.max(MIN_PADDING, largestSide * PADDING_RATIO)));
}

const FRAME_PADDING_RATIO = 0.1;
const FRAME_MIN_PADDING = 32;
const FRAME_MAX_PADDING = 160;

export function autoFramePadding(frame: { width: number; height: number }): number {
  const largestSide = Math.max(frame.width, frame.height);
  return Math.round(
    Math.min(FRAME_MAX_PADDING, Math.max(FRAME_MIN_PADDING, largestSide * FRAME_PADDING_RATIO))
  );
}

function computeContentRect(
  canvasWidth: number,
  canvasHeight: number,
  padding: number
): LayoutRect {
  return {
    x: padding,
    y: padding,
    width: Math.max(0, canvasWidth - padding * 2),
    height: Math.max(0, canvasHeight - padding * 2),
  };
}

function computeScreenshotRect(
  screenshot: ScreenshotDimensions,
  content: LayoutRect,
  transform: ScreenshotTransform,
  frameMode: boolean
): LayoutRect {
  const { scale, offsetX, offsetY } = transform;

  if (!frameMode) {
    const baseWidth = screenshot.width;
    const baseHeight = screenshot.height;
    const destWidth = baseWidth * scale;
    const destHeight = baseHeight * scale;
    const centerX = content.x + content.width / 2;
    const centerY = content.y + content.height / 2;

    return {
      x: centerX - destWidth / 2 + offsetX,
      y: centerY - destHeight / 2 + offsetY,
      width: destWidth,
      height: destHeight,
    };
  }

  const fitScale = Math.min(content.width / screenshot.width, content.height / screenshot.height);
  const baseWidth = screenshot.width * fitScale;
  const baseHeight = screenshot.height * fitScale;
  const destWidth = baseWidth * scale;
  const destHeight = baseHeight * scale;
  const centerX = content.x + content.width / 2;
  const centerY = content.y + content.height / 2;

  return {
    x: centerX - destWidth / 2 + offsetX,
    y: centerY - destHeight / 2 + offsetY,
    width: destWidth,
    height: destHeight,
  };
}

export function computeLayout(input: RenderInput): ComputedLayout {
  const { screenshot, padding, frame, transform } = input;
  const frameMode = frame !== null && frame.aspectRatio !== 'free';

  let canvasWidth: number;
  let canvasHeight: number;

  if (frameMode && frame) {
    canvasWidth = frame.width;
    canvasHeight = frame.height;
  } else {
    canvasWidth = screenshot.width + padding * 2;
    canvasHeight = screenshot.height + padding * 2;
  }

  const content = computeContentRect(canvasWidth, canvasHeight, padding);
  const screenshotRect = computeScreenshotRect(screenshot, content, transform, frameMode);

  return {
    canvasWidth,
    canvasHeight,
    content,
    screenshot: screenshotRect,
  };
}

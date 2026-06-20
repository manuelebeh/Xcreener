import type { ComputedLayout, LayoutRect } from '@snapglow/editor-core';
import type { TextLine } from './types';

export function mapLineToLayout(
  line: TextLine,
  layout: ComputedLayout,
  screenshotWidth: number,
  screenshotHeight: number
): LayoutRect {
  const scaleX = layout.screenshot.width / screenshotWidth;
  const scaleY = layout.screenshot.height / screenshotHeight;

  return {
    x: layout.screenshot.x + line.x * scaleX,
    y: layout.screenshot.y + line.y * scaleY,
    width: line.width * scaleX,
    height: line.height * scaleY,
  };
}

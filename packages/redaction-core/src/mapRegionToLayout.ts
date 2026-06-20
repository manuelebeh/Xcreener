import { computeLayout, type LayoutRect, type RenderInput } from '@snapglow/editor-core';

import type { SensitiveRegion } from './types';

export function mapRegionToLayout(region: SensitiveRegion, input: RenderInput): LayoutRect {
  const layout = computeLayout(input);
  const { screenshot } = input;
  const scaleX = layout.screenshot.width / screenshot.width;
  const scaleY = layout.screenshot.height / screenshot.height;

  return {
    x: layout.screenshot.x + region.x * scaleX,
    y: layout.screenshot.y + region.y * scaleY,
    width: region.width * scaleX,
    height: region.height * scaleY,
  };
}

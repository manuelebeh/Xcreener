import { DEFAULT_BACKGROUND, DEFAULT_SHADOW, type RenderInput } from '@snapglow/editor-core';
import { describe, expect, it } from 'vitest';

import { mapRegionToLayout } from './mapRegionToLayout';

function createInput(): RenderInput {
  return {
    screenshot: { width: 400, height: 300 },
    background: DEFAULT_BACKGROUND,
    padding: 24,
    borderRadius: 8,
    shadow: DEFAULT_SHADOW,
    frame: null,
    transform: { scale: 1, offsetX: 0, offsetY: 0 },
    annotations: [],
    selectedAnnotationId: null,
  };
}

describe('mapRegionToLayout', () => {
  it('maps screenshot coordinates into layout space', () => {
    const rect = mapRegionToLayout(
      { x: 40, y: 30, width: 80, height: 20, kind: 'email' },
      createInput()
    );

    expect(rect.x).toBeGreaterThan(0);
    expect(rect.y).toBeGreaterThan(0);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});

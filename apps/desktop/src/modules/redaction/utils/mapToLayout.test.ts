import { describe, expect, it } from 'vitest';
import type { RenderInput } from '@/modules/editor/types';
import { mapRegionToLayout } from './mapToLayout';

function createInput(): RenderInput {
  return {
    screenshot: { width: 400, height: 300, close: () => {} } as ImageBitmap,
    background: { type: 'solid', color: '#111111' },
    padding: 24,
    borderRadius: 8,
    shadow: {
      opacity: 0.2,
      blur: 16,
      offsetX: 0,
      offsetY: 8,
      color: '#000000',
    },
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

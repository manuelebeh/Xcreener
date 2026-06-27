import { describe, expect, it } from 'vitest';
import { computeLayout } from './computeLayout';
import type { RenderInput } from './types';

describe('render-core layout', () => {
  it('computes canvas dimensions from screenshot and padding', () => {
    const input = {
      screenshot: { width: 800, height: 600 } as RenderInput['screenshot'],
      background: { type: 'solid', color: '#111111' },
      padding: 40,
      borderRadius: 12,
      shadow: { opacity: 0, blur: 0, offsetX: 0, offsetY: 0, color: '#000' },
      frame: null,
      transform: { scale: 1, offsetX: 0, offsetY: 0 },
      annotations: [],
      selectedAnnotationId: null,
    } satisfies RenderInput;

    const layout = computeLayout(input);
    expect(layout.canvasWidth).toBeGreaterThan(800);
    expect(layout.canvasHeight).toBeGreaterThan(600);
  });
});

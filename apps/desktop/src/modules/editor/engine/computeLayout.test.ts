import { describe, expect, it } from 'vitest';
import { DEFAULT_SHADOW } from '../store';
import type { RenderInput } from '../types';
import { autoPadding, computeLayout } from './computeLayout';
import { DEFAULT_GRADIENT_PRESET_ID } from './gradients';

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return { width, height } as ImageBitmap;
}

function baseInput(overrides: Partial<RenderInput> = {}): RenderInput {
  return {
    screenshot: createMockScreenshot(800, 600),
    background: { type: 'gradient', presetId: DEFAULT_GRADIENT_PRESET_ID },
    padding: 40,
    borderRadius: 12,
    shadow: DEFAULT_SHADOW,
    ...overrides,
  };
}

describe('autoPadding', () => {
  it('uses 12% of the largest side clamped between 24 and 120', () => {
    expect(autoPadding(createMockScreenshot(400, 300))).toBe(48);
    expect(autoPadding(createMockScreenshot(100, 80))).toBe(24);
    expect(autoPadding(createMockScreenshot(2000, 1500))).toBe(120);
  });
});

describe('computeLayout', () => {
  it('centers the screenshot with padding on all sides', () => {
    const layout = computeLayout(baseInput({ padding: 50 }));

    expect(layout).toEqual({
      canvasWidth: 900,
      canvasHeight: 700,
      screenshot: { x: 50, y: 50, width: 800, height: 600 },
    });
  });
});

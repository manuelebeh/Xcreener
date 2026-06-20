import { describe, expect, it } from 'vitest';
import {
  autoFramePadding,
  autoPadding,
  computeLayout,
  zoomTransformAtPointer,
} from './computeLayout';
import { DEFAULT_GRADIENT_PRESET_ID } from './gradients';
import { getPresetById } from './presets';
import {
  DEFAULT_SHADOW,
  DEFAULT_TRANSFORM,
  type RenderInput,
  type ScreenshotDimensions,
} from './types';

function createMockScreenshot(width: number, height: number): ScreenshotDimensions {
  return { width, height };
}

function baseInput(overrides: Partial<RenderInput> = {}): RenderInput {
  return {
    screenshot: createMockScreenshot(800, 600),
    background: { type: 'gradient', presetId: DEFAULT_GRADIENT_PRESET_ID },
    padding: 40,
    borderRadius: 12,
    shadow: DEFAULT_SHADOW,
    frame: null,
    transform: DEFAULT_TRANSFORM,
    annotations: [],
    selectedAnnotationId: null,
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

describe('autoFramePadding', () => {
  it('uses 10% of the frame largest side clamped between 32 and 160', () => {
    expect(autoFramePadding({ width: 1080, height: 1080 })).toBe(108);
    expect(autoFramePadding({ width: 1600, height: 900 })).toBe(160);
    expect(autoFramePadding({ width: 400, height: 300 })).toBe(40);
  });
});

describe('zoomTransformAtPointer', () => {
  it('keeps the pointer focus stable when zooming in frame mode', () => {
    const frame = getPresetById('instagram');
    const input = baseInput({ frame, padding: 40 });
    const layout = computeLayout(input);
    const pointerX = layout.screenshot.x + layout.screenshot.width * 0.25;
    const pointerY = layout.screenshot.y + layout.screenshot.height * 0.25;

    const next = zoomTransformAtPointer(layout, input.transform, pointerX, pointerY, 1.5);

    const zoomedLayout = computeLayout({ ...input, transform: next });
    const nextFocusX = (pointerX - zoomedLayout.screenshot.x) / zoomedLayout.screenshot.width;

    expect(next.scale).toBe(1.5);
    expect(nextFocusX).toBeCloseTo(0.25, 5);
  });
});

describe('computeLayout', () => {
  it('centers the screenshot with padding on all sides in free mode', () => {
    const layout = computeLayout(baseInput({ padding: 50 }));

    expect(layout).toEqual({
      canvasWidth: 900,
      canvasHeight: 700,
      content: { x: 50, y: 50, width: 800, height: 600 },
      screenshot: { x: 50, y: 50, width: 800, height: 600 },
    });
  });

  it('uses fixed frame dimensions for aspect-ratio presets', () => {
    const frame = getPresetById('instagram');
    const layout = computeLayout(baseInput({ frame, padding: 40 }));

    expect(layout.canvasWidth).toBe(1080);
    expect(layout.canvasHeight).toBe(1080);
    expect(layout.content).toEqual({ x: 40, y: 40, width: 1000, height: 1000 });
  });

  it('applies transform scale and offset in frame mode', () => {
    const frame = getPresetById('ratio-1-1');
    const layout = computeLayout(
      baseInput({
        frame,
        padding: 0,
        transform: { scale: 2, offsetX: 10, offsetY: -5 },
      })
    );

    expect(layout.canvasWidth).toBe(1080);
    expect(layout.screenshot.width).toBeGreaterThan(800);
    expect(layout.screenshot.x).not.toBe(0);
  });
});

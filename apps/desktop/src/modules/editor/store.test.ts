import { describe, expect, it } from 'vitest';
import { autoPadding } from './engine/computeLayout';
import { DEFAULT_BORDER_RADIUS, DEFAULT_SHADOW, useEditorStore } from './store';

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return { width, height, close: () => {} } as ImageBitmap;
}

describe('useEditorStore', () => {
  it('applies beautification defaults when a screenshot is set', () => {
    const screenshot = createMockScreenshot(800, 600);

    useEditorStore.getState().setScreenshot(screenshot);

    expect(useEditorStore.getState()).toMatchObject({
      screenshot,
      background: { type: 'gradient', presetId: 'snapglow-brand' },
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
      padding: autoPadding(screenshot),
      paddingTouched: false,
    });
  });

  it('merges partial shadow updates', () => {
    useEditorStore.getState().updateShadow({ blur: 10 });

    expect(useEditorStore.getState().shadow.blur).toBe(10);
    expect(useEditorStore.getState().shadow.offsetY).toBe(DEFAULT_SHADOW.offsetY);
  });

  it('marks padding as touched when adjusted manually', () => {
    useEditorStore.getState().setPadding(80);

    expect(useEditorStore.getState()).toMatchObject({
      padding: 80,
      paddingTouched: true,
    });
  });
});

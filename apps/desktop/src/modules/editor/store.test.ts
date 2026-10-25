import { beforeEach, describe, expect, it } from 'vitest';
import { autoFramePadding, autoPadding } from './engine/computeLayout';
import { FREE_PRESET_ID, getPresetStyleDefaults } from './engine/presets';
import { DEFAULT_BORDER_RADIUS, DEFAULT_SHADOW, useEditorStore } from './store';
import { DEFAULT_TRANSFORM } from './types';

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return { width, height, close: () => {} } as ImageBitmap;
}

beforeEach(() => {
  useEditorStore.getState().setScreenshot(null);
  useEditorStore.getState().setCustomPresets([]);
});

describe('useEditorStore', () => {
  it('applies beautification defaults when a screenshot is set', () => {
    const screenshot = createMockScreenshot(800, 600);

    useEditorStore.getState().setScreenshot(screenshot);

    expect(useEditorStore.getState()).toMatchObject({
      screenshot,
      background: { type: 'gradient', presetId: 'xcreener-brand' },
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
      padding: autoPadding(screenshot),
      paddingTouched: false,
      selectedPresetId: null,
      transform: DEFAULT_TRANSFORM,
      annotations: [],
      selectedAnnotationId: null,
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

  it('applies frame preset with frame-aware padding and style defaults', () => {
    const screenshot = createMockScreenshot(800, 600);
    useEditorStore.getState().setScreenshot(screenshot);

    useEditorStore.getState().setPreset('instagram');

    const state = useEditorStore.getState();
    const instagramDefaults = getPresetStyleDefaults('instagram');

    expect(state.selectedPresetId).toBe('instagram');
    expect(state.transform).toEqual(DEFAULT_TRANSFORM);
    expect(state.padding).toBe(autoFramePadding({ width: 1080, height: 1080 }));
    expect(state.borderRadius).toBe(instagramDefaults?.borderRadius);
    expect(state.shadow).toEqual(instagramDefaults?.shadow);
  });

  it('applies a network variant with its own size and the network style', () => {
    const screenshot = createMockScreenshot(800, 600);
    useEditorStore.getState().setScreenshot(screenshot);

    useEditorStore.getState().setPreset('instagram-story');

    const state = useEditorStore.getState();
    const instagramDefaults = getPresetStyleDefaults('instagram');

    expect(state.selectedPresetId).toBe('instagram-story');
    expect(state.padding).toBe(autoFramePadding({ width: 1080, height: 1920 }));
    expect(state.borderRadius).toBe(instagramDefaults?.borderRadius);
  });

  it('preserves manual padding when changing preset', () => {
    const screenshot = createMockScreenshot(800, 600);
    useEditorStore.getState().setScreenshot(screenshot);
    useEditorStore.getState().setPadding(100);

    useEditorStore.getState().setPreset('twitter');

    expect(useEditorStore.getState().padding).toBe(100);
  });

  it('restores free-mode padding and defaults when selecting libre', () => {
    const screenshot = createMockScreenshot(800, 600);
    useEditorStore.getState().setScreenshot(screenshot);
    useEditorStore.getState().setPreset('instagram');

    useEditorStore.getState().setPreset(FREE_PRESET_ID);

    expect(useEditorStore.getState()).toMatchObject({
      selectedPresetId: null,
      padding: autoPadding(screenshot),
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadow: DEFAULT_SHADOW,
    });
  });

  it('clears preset when selecting free mode', () => {
    const screenshot = createMockScreenshot(800, 600);
    useEditorStore.getState().setScreenshot(screenshot);
    useEditorStore.getState().setPreset('twitter');

    useEditorStore.getState().setPreset(FREE_PRESET_ID);

    expect(useEditorStore.getState().selectedPresetId).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { SHADOW_STRONG } from '@snapglow/style-suggestion-core';
import { mapContentClassToStyle } from '@snapglow/style-suggestion-core';
import { useEditorStore } from '@/modules/editor/store';
import { applySuggestedStyle } from '@/modules/style-suggestion/utils/applySuggestedStyle';

function createMockScreenshot(width: number, height: number): ImageBitmap {
  return { width, height, close: () => {} } as ImageBitmap;
}

beforeEach(() => {
  useEditorStore.getState().setScreenshot(null);
});

describe('applySuggestedStyle', () => {
  it('applies mapped code style to the editor store', async () => {
    useEditorStore.getState().setScreenshot(createMockScreenshot(800, 600));

    const suggestion = mapContentClassToStyle('code');
    await applySuggestedStyle(suggestion);

    const state = useEditorStore.getState();
    expect(state.padding).toBe(60);
    expect(state.borderRadius).toBe(12);
    expect(state.background).toEqual({ type: 'gradient', presetId: 'indigo' });
    expect(state.shadow).toEqual(SHADOW_STRONG);
    expect(state.paddingTouched).toBe(true);
  });
});

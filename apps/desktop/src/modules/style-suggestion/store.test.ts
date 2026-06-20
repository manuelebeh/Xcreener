import { describe, expect, it } from 'vitest';

import { useStyleSuggestionStore } from '@/modules/style-suggestion/store';

describe('useStyleSuggestionStore', () => {
  it('tracks ready suggestions and dismisses them', () => {
    useStyleSuggestionStore.getState().clear();
    useStyleSuggestionStore.getState().setClassifying();
    expect(useStyleSuggestionStore.getState().status).toBe('classifying');

    useStyleSuggestionStore.getState().setReady(
      'code',
      {
        label: 'Code source',
        background: { type: 'gradient', presetId: 'indigo' },
        padding: 60,
        borderRadius: 12,
        shadow: {
          opacity: 0.45,
          blur: 32,
          offsetX: 0,
          offsetY: 12,
          color: '#000000',
        },
      },
      0.88
    );

    expect(useStyleSuggestionStore.getState().status).toBe('ready');
    expect(useStyleSuggestionStore.getState().contentClass).toBe('code');

    useStyleSuggestionStore.getState().dismiss();
    expect(useStyleSuggestionStore.getState().status).toBe('dismissed');
  });
});

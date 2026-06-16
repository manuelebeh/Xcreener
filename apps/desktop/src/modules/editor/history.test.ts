import { beforeEach, describe, expect, it } from 'vitest';
import type { RectAnnotation } from './annotations/types';
import { HISTORY_MAX } from './annotations/types';
import { useEditorStore } from './store';

function createRect(id: string): RectAnnotation {
  return {
    type: 'rect',
    id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    stroke: '#000',
    strokeWidth: 2,
    fill: null,
  };
}

beforeEach(() => {
  useEditorStore.getState().setScreenshot(null);
});

describe('annotation history', () => {
  it('supports undo and redo', () => {
    const store = useEditorStore.getState();
    store.pushHistory();
    store.addAnnotation(createRect('a'));
    store.undo();
    expect(useEditorStore.getState().annotations).toHaveLength(0);
    store.redo();
    expect(useEditorStore.getState().annotations).toHaveLength(1);
  });

  it('caps history at 20 levels', () => {
    const store = useEditorStore.getState();
    for (let index = 0; index < HISTORY_MAX + 5; index += 1) {
      store.pushHistory();
      store.addAnnotation(createRect(`rect-${index}`));
      store.setAnnotations([]);
    }

    expect(useEditorStore.getState().history.past.length).toBeLessThanOrEqual(HISTORY_MAX);
  });
});

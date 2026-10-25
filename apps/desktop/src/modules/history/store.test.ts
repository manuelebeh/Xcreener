import { beforeEach, describe, expect, it } from 'vitest';
import type { StoredCapture } from '@/db/captures';
import { useHistoryStore } from './store';

function capture(id: number): StoredCapture {
  return {
    id,
    filename: `${id}.png`,
    filepath: `/captures/${id}.png`,
    thumbnail: null,
    width: 10,
    height: 10,
    format: 'png',
    fileSize: 1,
    tags: [],
    ocrText: null,
    createdAt: '2026-10-25T10:00:00Z',
  };
}

describe('history store deletes', () => {
  beforeEach(() => {
    useHistoryStore.setState({ captures: [], hiddenIds: [] });
  });

  it('keeps a pending delete out of reloaded lists', () => {
    const { setCaptures, removeCaptureFromList } = useHistoryStore.getState();
    setCaptures([capture(1), capture(2)]);
    removeCaptureFromList(1);

    setCaptures([capture(1), capture(2)]);

    expect(useHistoryStore.getState().captures.map((item) => item.id)).toEqual([2]);
  });

  it('shows the capture again once the delete is released or undone', () => {
    const { setCaptures, removeCaptureFromList, releaseHidden, restoreCapture } =
      useHistoryStore.getState();
    removeCaptureFromList(1);
    releaseHidden(1);
    setCaptures([capture(1)]);
    expect(useHistoryStore.getState().captures).toHaveLength(1);

    removeCaptureFromList(1);
    restoreCapture(capture(1));
    setCaptures([capture(1)]);
    expect(useHistoryStore.getState().captures).toHaveLength(1);
  });
});

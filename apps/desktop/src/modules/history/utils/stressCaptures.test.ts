import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '@/modules/editor/store';
import { flushPersistQueue, persistCapture } from './persistCapture';

const writeCaptureFiles = vi.fn();
const insertCapture = vi.fn();
const pruneCaptures = vi.fn();
const deleteCaptureFiles = vi.fn();

vi.mock('./captureFiles', () => ({
  writeCaptureFiles: (...args: unknown[]) => writeCaptureFiles(...args),
  deleteCaptureFiles: (...args: unknown[]) => deleteCaptureFiles(...args),
}));

vi.mock('@/db/captures', () => ({
  insertCapture: (...args: unknown[]) => insertCapture(...args),
  pruneCaptures: (...args: unknown[]) => pruneCaptures(...args),
}));

function createMockBitmap(id: number): ImageBitmap {
  return {
    close: vi.fn(),
    width: 800,
    height: 600,
    id,
  } as unknown as ImageBitmap;
}

describe('stressCaptures', () => {
  beforeEach(() => {
    useEditorStore.getState().setScreenshot(null);
    writeCaptureFiles.mockReset();
    insertCapture.mockReset();
    pruneCaptures.mockReset();
    deleteCaptureFiles.mockReset();

    writeCaptureFiles.mockResolvedValue({
      capturePath: '/tmp/capture.png',
      thumbnailPath: '/tmp/thumb.webp',
    });
    insertCapture.mockResolvedValue(1);
    pruneCaptures.mockResolvedValue([]);
  });

  it('closes previous ImageBitmap on 50 consecutive setScreenshot calls', () => {
    let closeCount = 0;

    for (let index = 0; index < 50; index += 1) {
      const bitmap = createMockBitmap(index);
      vi.mocked(bitmap.close).mockImplementation(() => {
        closeCount += 1;
      });
      useEditorStore.getState().setScreenshot(bitmap);
    }

    expect(closeCount).toBe(49);
    expect(useEditorStore.getState().screenshot).not.toBeNull();
  });

  it('queues 50 persist operations sequentially', async () => {
    const order: number[] = [];
    writeCaptureFiles.mockImplementation(async () => {
      order.push(order.length + 1);
      return {
        capturePath: `/tmp/capture-${order.length}.png`,
        thumbnailPath: `/tmp/thumb-${order.length}.webp`,
      };
    });

    for (let index = 0; index < 50; index += 1) {
      persistCapture({ bytes: [1, 2, 3, index], width: 100, height: 100 });
    }

    await flushPersistQueue();
    expect(writeCaptureFiles).toHaveBeenCalledTimes(50);
    expect(order).toHaveLength(50);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('persistCapture', () => {
  beforeEach(() => {
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

  it('writes files, inserts capture, and prunes history', async () => {
    persistCapture({ bytes: new Uint8Array([137, 80, 78, 71]), width: 800, height: 600 });
    await flushPersistQueue();

    expect(writeCaptureFiles).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      800,
      600,
      expect.any(Date)
    );
    expect(insertCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: '/tmp/capture.png',
        thumbnail: '/tmp/thumb.webp',
        width: 800,
        height: 600,
        fileSize: 4,
        format: 'png',
      })
    );
    expect(pruneCaptures).toHaveBeenCalledWith(30);
  });

  it('deletes files for pruned captures', async () => {
    pruneCaptures.mockResolvedValue([
      {
        id: 9,
        filepath: '/tmp/old.png',
        thumbnail: '/tmp/old.webp',
      },
    ]);

    persistCapture({ bytes: new Uint8Array([1, 2, 3]), width: 100, height: 100 });
    await flushPersistQueue();

    expect(deleteCaptureFiles).toHaveBeenCalledWith('/tmp/old.png', '/tmp/old.webp');
  });
});

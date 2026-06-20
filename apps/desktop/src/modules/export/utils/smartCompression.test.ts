import { describe, expect, it, vi } from 'vitest';
import { bytesToBlob } from '@/shared/utils/image';
import { maybeCompressExportBlob } from './smartCompression';

vi.mock('@/tauri/commands', () => ({
  compressExportBytes: vi.fn(async (imageData: number[]) =>
    imageData.slice(0, Math.floor(imageData.length * 0.6))
  ),
}));

describe('maybeCompressExportBlob', () => {
  it('returns original blob when compression is disabled', async () => {
    const blob = bytesToBlob([1, 2, 3, 4]);
    const result = await maybeCompressExportBlob(blob, 'png', 100, false);
    expect(result.blob).toBe(blob);
    expect(result.compressionPercent).toBeNull();
  });

  it('returns compressed blob when enabled', async () => {
    const blob = bytesToBlob(Array.from({ length: 100 }, (_, index) => index));
    const result = await maybeCompressExportBlob(blob, 'png', 100, true);
    expect(result.blob.size).toBeLessThan(blob.size);
    expect(result.compressionPercent).toBeGreaterThan(0);
  });
});

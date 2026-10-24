import { bytesToBlob } from '@/shared/utils/image';
import { compressExportBytes } from '@/tauri/commands';
import type { ExportFormat } from './formats';

export async function maybeCompressExportBlob(
  blob: Blob,
  format: ExportFormat,
  quality: number,
  enabled: boolean
): Promise<{ blob: Blob; compressionPercent: number | null }> {
  if (!enabled) {
    return { blob, compressionPercent: null };
  }

  const originalSize = blob.size;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const compressedBytes = await compressExportBytes(bytes, format, quality);
  const compressedBlob = bytesToBlob(new Uint8Array(compressedBytes), blob.type);

  if (compressedBlob.size >= originalSize) {
    return { blob, compressionPercent: 0 };
  }

  const compressionPercent = Math.round((1 - compressedBlob.size / originalSize) * 100);
  return { blob: compressedBlob, compressionPercent };
}

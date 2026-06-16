import { Image } from '@tauri-apps/api/image';
import { writeImage } from '@tauri-apps/plugin-clipboard-manager';
import type { useExportRender } from '../hooks/useExportRender';
import type { ExportFormat } from '../utils/formats';

export async function copyExportToClipboard(
  exportImage: ReturnType<typeof useExportRender>['exportImage'],
  format: ExportFormat = 'png'
): Promise<{ size: number; durationMs: number }> {
  const { blob, durationMs } = await exportImage(format, format === 'png' ? 100 : 90);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const image = await Image.fromBytes(bytes);
  await writeImage(image);
  return { size: bytes.byteLength, durationMs };
}

import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { ExportFormat } from './formats';

const EXTENSIONS: Record<ExportFormat, string> = {
  png: 'png',
  jpg: 'jpg',
  webp: 'webp',
};

const FILTERS: Record<ExportFormat, { name: string; extensions: string[] }[]> = {
  png: [{ name: 'PNG Image', extensions: ['png'] }],
  jpg: [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }],
  webp: [{ name: 'WebP Image', extensions: ['webp'] }],
};

export async function saveExportBlob(
  blob: Blob,
  format: ExportFormat,
  suggestedName = `xcreener-export.${EXTENSIONS[format]}`
): Promise<string | null> {
  const path = await save({
    defaultPath: suggestedName,
    filters: FILTERS[format],
  });

  if (!path) {
    return null;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  await writeFile(path, bytes);
  return path;
}

import { save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import type { CaptureRecordOutputFormat } from '@/shared/types/ipc';

const FILTERS: Record<CaptureRecordOutputFormat, { name: string; extensions: string[] }[]> = {
  gif: [{ name: 'GIF Animation', extensions: ['gif'] }],
  mp4: [{ name: 'MP4 Video', extensions: ['mp4'] }],
};

export async function saveRecordingFile(
  sourcePath: string,
  format: CaptureRecordOutputFormat,
  suggestedName = `snapglow-recording.${format}`
): Promise<string | null> {
  const path = await save({
    defaultPath: suggestedName,
    filters: FILTERS[format],
  });

  if (!path) {
    return null;
  }

  const bytes = await readFile(sourcePath);
  await writeFile(path, bytes);
  return path;
}

export async function readRecordingBytes(sourcePath: string): Promise<Uint8Array> {
  return readFile(sourcePath);
}

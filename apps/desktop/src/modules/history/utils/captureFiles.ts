import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, readFile, remove, writeFile } from '@tauri-apps/plugin-fs';
import { generateCaptureFilename, generateThumbnailFilename, monthFolder } from './filenames';
import { generateThumbnailBytes } from './thumbnail';

export interface CaptureFilePaths {
  capturePath: string;
  thumbnailPath: string;
}

export async function ensureCaptureDirectories(date = new Date()): Promise<{
  capturesDir: string;
  thumbnailsDir: string;
}> {
  const base = await appDataDir();
  const capturesDir = await join(base, 'captures', monthFolder(date));
  const thumbnailsDir = await join(base, 'thumbnails');

  await mkdir(capturesDir, { recursive: true });
  await mkdir(thumbnailsDir, { recursive: true });

  return { capturesDir, thumbnailsDir };
}

export async function writeCaptureFiles(
  pngBytes: Uint8Array,
  width: number,
  height: number,
  date = new Date()
): Promise<CaptureFilePaths> {
  const { capturesDir, thumbnailsDir } = await ensureCaptureDirectories(date);
  const captureFilename = generateCaptureFilename(date);
  const thumbnailFilename = generateThumbnailFilename(date);
  const capturePath = await join(capturesDir, captureFilename);
  const thumbnailPath = await join(thumbnailsDir, thumbnailFilename);

  await writeFile(capturePath, pngBytes);

  const thumbnailBytes = await generateThumbnailBytes(pngBytes, width, height);
  await writeFile(thumbnailPath, thumbnailBytes);

  return { capturePath, thumbnailPath };
}

export async function readCaptureBytes(filepath: string): Promise<Uint8Array> {
  const data = await readFile(filepath);
  // Copy so the buffer stays valid after decode (WKWebView can invalidate views).
  return new Uint8Array(data);
}

export async function deleteCaptureFiles(
  filepath: string,
  thumbnailPath: string | null
): Promise<void> {
  await remove(filepath).catch(() => undefined);
  if (thumbnailPath) {
    await remove(thumbnailPath).catch(() => undefined);
  }
}

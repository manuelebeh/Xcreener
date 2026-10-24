import { join } from '@tauri-apps/api/path';
import { copyFile, readFile, remove, writeFile } from '@tauri-apps/plugin-fs';
import { insertCapture, pruneCaptures } from '@/db/captures';
import type { CaptureRecordOutputFormat } from '@/shared/types/ipc';
import { deleteCaptureFiles, ensureCaptureDirectories } from './captureFiles';
import { generateCaptureFilename, generateThumbnailFilename } from './filenames';
import { generateThumbnailBytes } from './thumbnail';

export interface PersistRecordingInput {
  sourcePath: string;
  format: CaptureRecordOutputFormat;
  width: number;
  height: number;
  thumbnailPng?: Uint8Array;
}

let persistQueue: Promise<void> = Promise.resolve();

async function persistRecordingInternal(input: PersistRecordingInput): Promise<void> {
  const now = new Date();
  const { capturesDir, thumbnailsDir } = await ensureCaptureDirectories(now);
  const captureFilename = generateCaptureFilename(now, input.format);
  const thumbnailFilename = generateThumbnailFilename(now);
  const capturePath = await join(capturesDir, captureFilename);
  const thumbnailPath = await join(thumbnailsDir, thumbnailFilename);

  await copyFile(input.sourcePath, capturePath);
  await remove(input.sourcePath).catch(() => undefined);
  const fileBytes = await readFile(capturePath);

  let thumbnail: string | null = null;
  if (input.thumbnailPng && input.thumbnailPng.length > 0) {
    const thumbnailBytes = await generateThumbnailBytes(
      input.thumbnailPng,
      input.width,
      input.height
    );
    await writeFile(thumbnailPath, thumbnailBytes);
    thumbnail = thumbnailPath;
  }

  await insertCapture({
    filename: captureFilename,
    filepath: capturePath,
    thumbnail,
    width: input.width,
    height: input.height,
    fileSize: fileBytes.length,
    format: input.format,
  });

  const removed = await pruneCaptures(30);
  await Promise.all(
    removed.map((capture) => deleteCaptureFiles(capture.filepath, capture.thumbnail))
  );
}

export function persistRecording(input: PersistRecordingInput): Promise<void> {
  const run = persistQueue.then(() => persistRecordingInternal(input));
  persistQueue = run.catch((error) => {
    console.error('[history] failed to persist recording', error);
  });
  return run;
}

export function flushPersistRecordingQueue(): Promise<void> {
  return persistQueue;
}

import { linesToPlainText } from '@snapglow/ocr-core';
import { insertCapture, pruneCaptures, updateCaptureOcrText } from '@/db/captures';
import { syncCaptureToLibrary } from '@/modules/cloud/syncLibrary';
import { useSettingsStore } from '@/modules/settings/store';
import { recognizeText } from '@/tauri/commands';
import { deleteCaptureFiles, writeCaptureFiles } from './captureFiles';
import { generateCaptureFilename } from './filenames';

export interface PersistCaptureInput {
  bytes: Uint8Array;
  width: number;
  height: number;
}

let persistQueue: Promise<void> = Promise.resolve();
let lastPersistFingerprint: string | null = null;
let lastPersistAt = 0;

function captureFingerprint(bytes: Uint8Array | number[]): string {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const sample = uint8.length > 64 ? uint8.slice(0, 64) : uint8;
  return `${uint8.length}:${Array.from(sample).join(',')}`;
}

async function indexCaptureOcr(id: number, pngBytes: Uint8Array): Promise<string | null> {
  try {
    const { ocrEngine, ocrLanguages } = useSettingsStore.getState();
    const lines = await recognizeText(pngBytes, {
      engine: ocrEngine,
      languages: ocrLanguages
        .split('+')
        .map((language) => language.trim())
        .filter(Boolean),
    });
    const text = linesToPlainText(lines).trim();
    if (text) {
      await updateCaptureOcrText(id, text);
    }
    return text || null;
  } catch (error) {
    console.debug('[history] OCR indexing skipped', error);
    return null;
  }
}

async function persistCaptureInternal(input: PersistCaptureInput): Promise<void> {
  const now = new Date();
  const pngBytes = input.bytes;
  const { capturePath, thumbnailPath } = await writeCaptureFiles(
    pngBytes,
    input.width,
    input.height,
    now
  );

  const filename = generateCaptureFilename(now);
  const uid = crypto.randomUUID();
  const captureId = await insertCapture({
    uid,
    filename,
    filepath: capturePath,
    thumbnail: thumbnailPath,
    width: input.width,
    height: input.height,
    fileSize: pngBytes.length,
    format: 'png',
  });

  const removed = await pruneCaptures(30);
  await Promise.all(
    removed.map((capture) => deleteCaptureFiles(capture.filepath, capture.thumbnail))
  );

  const ocrText = await indexCaptureOcr(captureId, pngBytes);
  syncCaptureToLibrary({
    localId: uid,
    filepath: capturePath,
    filename,
    mimeType: 'image/png',
    ocrText,
  });
}

export function persistCapture(input: PersistCaptureInput): void {
  const fingerprint = captureFingerprint(input.bytes);
  const now = Date.now();
  if (lastPersistFingerprint === fingerprint && now - lastPersistAt < 1500) {
    return;
  }
  lastPersistFingerprint = fingerprint;
  lastPersistAt = now;

  persistQueue = persistQueue
    .then(() => persistCaptureInternal(input))
    .catch((error) => {
      console.error('[history] failed to persist capture', error);
    });
}

/** @internal Test helper to await queued persistence. */
export function flushPersistQueue(): Promise<void> {
  return persistQueue;
}

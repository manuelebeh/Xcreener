import type { DbCaptureRow } from '@/shared/types/ipc';
import {
  dbCapturesDelete,
  dbCapturesGet,
  dbCapturesInsert,
  dbCapturesList,
  dbCapturesListByCollection,
  dbCapturesListByTag,
  dbCapturesSearch,
  dbCapturesUidExists,
  dbCapturesUpdateOcrText,
  dbCapturesUpdateTags,
} from '@/tauri/commands';
import { ensureMigrationsApplied } from './migrate';

const DEFAULT_MAX_CAPTURES = 30;

export interface StoredCapture {
  id: number;
  filename: string;
  filepath: string;
  thumbnail: string | null;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  tags: string[];
  ocrText: string | null;
  ocrSnippet?: string | null;
  createdAt: string;
}

export interface InsertCaptureInput {
  filename: string;
  filepath: string;
  thumbnail: string | null;
  width: number;
  height: number;
  fileSize: number;
  format?: string;
  tags?: string[];
  /** Cross-device id sent to the cloud library as `localId`. Generated when omitted. */
  uid?: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function rowToStored(row: DbCaptureRow): StoredCapture {
  return {
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    thumbnail: row.thumbnail,
    width: row.width,
    height: row.height,
    format: row.format,
    fileSize: row.file_size,
    tags: parseTags(row.tags),
    ocrText: row.ocr_text,
    ocrSnippet: row.snippet ?? null,
    createdAt: row.created_at,
  };
}

export async function insertCapture(input: InsertCaptureInput): Promise<number> {
  await ensureMigrationsApplied();
  return dbCapturesInsert({
    filename: input.filename,
    filepath: input.filepath,
    thumbnail: input.thumbnail,
    width: input.width,
    height: input.height,
    fileSize: input.fileSize,
    format: input.format ?? 'png',
    tags: JSON.stringify(input.tags ?? []),
    uid: input.uid ?? crypto.randomUUID(),
  });
}

export async function updateCaptureOcrText(id: number, ocrText: string): Promise<void> {
  await ensureMigrationsApplied();
  await dbCapturesUpdateOcrText(id, ocrText);
}

export async function updateCaptureTags(id: number, tags: string[]): Promise<void> {
  await ensureMigrationsApplied();
  await dbCapturesUpdateTags(id, JSON.stringify(tags));
}

export async function listCaptures(limit = DEFAULT_MAX_CAPTURES): Promise<StoredCapture[]> {
  await ensureMigrationsApplied();
  return (await dbCapturesList(limit)).map(rowToStored);
}

/** Full-text search on OCR text, with a LIKE fallback when the query is not valid FTS5. */
export async function searchCaptures(
  query: string,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  if (!query.trim()) {
    return listCaptures(limit);
  }
  await ensureMigrationsApplied();
  return (await dbCapturesSearch(query, limit)).map(rowToStored);
}

export async function listCapturesByTag(
  tag: string,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  await ensureMigrationsApplied();
  return (await dbCapturesListByTag(tag, limit)).map(rowToStored);
}

export async function listCapturesByCollection(
  collectionId: number,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  await ensureMigrationsApplied();
  return (await dbCapturesListByCollection(collectionId, limit)).map(rowToStored);
}

export async function getCapture(id: number): Promise<StoredCapture | null> {
  await ensureMigrationsApplied();
  const row = await dbCapturesGet(id);
  return row ? rowToStored(row) : null;
}

export async function captureUidExists(uid: string): Promise<boolean> {
  await ensureMigrationsApplied();
  return dbCapturesUidExists(uid);
}

export async function deleteCaptureRow(id: number): Promise<StoredCapture | null> {
  await ensureMigrationsApplied();
  const row = await dbCapturesDelete(id);
  return row ? rowToStored(row) : null;
}

export async function pruneCaptures(max = DEFAULT_MAX_CAPTURES): Promise<StoredCapture[]> {
  const captures = await listCaptures(max + 1000);
  if (captures.length <= max) {
    return [];
  }

  const removed: StoredCapture[] = [];
  for (const capture of captures.slice(max)) {
    const deleted = await deleteCaptureRow(capture.id);
    if (deleted) {
      removed.push(deleted);
    }
  }
  return removed;
}

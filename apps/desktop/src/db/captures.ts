import { getDb } from './connection';
import { ensureMigrationsApplied } from './migrate';

const DEFAULT_MAX_CAPTURES = 30;

async function getReadyDb() {
  await ensureMigrationsApplied();
  return getDb();
}

interface CaptureRow {
  id: number;
  filename: string;
  filepath: string;
  thumbnail: string | null;
  width: number;
  height: number;
  format: string;
  file_size: number;
  preset_used: string | null;
  tags: string | null;
  ocr_text: string | null;
  created_at: string;
}

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

function rowToStored(row: CaptureRow, ocrSnippet?: string | null): StoredCapture {
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
    ocrSnippet: ocrSnippet ?? null,
    createdAt: row.created_at,
  };
}

export async function insertCapture(input: InsertCaptureInput): Promise<number> {
  const db = await getReadyDb();
  const tagsJson = JSON.stringify(input.tags ?? []);
  const result = await db.execute(
    `INSERT INTO captures (filename, filepath, thumbnail, width, height, format, file_size, tags, uid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.filename,
      input.filepath,
      input.thumbnail,
      input.width,
      input.height,
      input.format ?? 'png',
      input.fileSize,
      tagsJson,
      input.uid ?? crypto.randomUUID(),
    ]
  );

  const id =
    result.lastInsertId ??
    (await db.select<{ id: number }[]>('SELECT id FROM captures ORDER BY id DESC LIMIT 1'))[0]?.id;

  if (id === undefined) {
    throw new Error('Failed to insert capture');
  }

  return id;
}

export async function updateCaptureOcrText(id: number, ocrText: string): Promise<void> {
  const db = await getReadyDb();
  await db.execute("UPDATE captures SET ocr_text = ?, updated_at = datetime('now') WHERE id = ?", [
    ocrText,
    id,
  ]);
}

export async function updateCaptureTags(id: number, tags: string[]): Promise<void> {
  const db = await getReadyDb();
  await db.execute("UPDATE captures SET tags = ?, updated_at = datetime('now') WHERE id = ?", [
    JSON.stringify(tags),
    id,
  ]);
}

export async function listCaptures(limit = DEFAULT_MAX_CAPTURES): Promise<StoredCapture[]> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, ocr_text, created_at
     FROM captures ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((row) => rowToStored(row));
}

export async function searchCaptures(
  query: string,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return listCaptures(limit);
  }

  const db = await getReadyDb();
  const ftsQuery = trimmed
    .split(/\s+/)
    .map((term) => term.replace(/"/g, '""'))
    .join(' ');

  try {
    const rows = await db.select<CaptureRow[]>(
      `SELECT c.id, c.filename, c.filepath, c.thumbnail, c.width, c.height, c.format, c.file_size,
              c.preset_used, c.tags, c.ocr_text, c.created_at,
              snippet(captures_fts, 0, '…', '…', '…', 8) AS snippet
       FROM captures_fts
       JOIN captures c ON c.id = captures_fts.rowid
       WHERE captures_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [ftsQuery, limit]
    );

    return rows.map((row) =>
      rowToStored(row, (row as CaptureRow & { snippet?: string }).snippet ?? null)
    );
  } catch {
    const like = `%${trimmed.replace(/%/g, '\\%')}%`;
    const rows = await db.select<CaptureRow[]>(
      `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, ocr_text, created_at
       FROM captures
       WHERE ocr_text LIKE ? OR filename LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [like, like, limit]
    );
    return rows.map((row) => rowToStored(row));
  }
}

export async function listCapturesByTag(
  tag: string,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, ocr_text, created_at
     FROM captures
     WHERE tags LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [`%"${tag.replace(/"/g, '\\"')}"%`, limit]
  );
  return rows.map((row) => rowToStored(row));
}

export async function listCapturesByCollection(
  collectionId: number,
  limit = DEFAULT_MAX_CAPTURES
): Promise<StoredCapture[]> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT c.id, c.filename, c.filepath, c.thumbnail, c.width, c.height, c.format, c.file_size,
            c.preset_used, c.tags, c.ocr_text, c.created_at
     FROM captures c
     JOIN capture_collections cc ON cc.capture_id = c.id
     WHERE cc.collection_id = ?
     ORDER BY c.created_at DESC
     LIMIT ?`,
    [collectionId, limit]
  );
  return rows.map((row) => rowToStored(row));
}

export async function getCapture(id: number): Promise<StoredCapture | null> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, ocr_text, created_at
     FROM captures WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? rowToStored(row) : null;
}

export async function captureUidExists(uid: string): Promise<boolean> {
  const db = await getReadyDb();
  const rows = await db.select<{ id: number }[]>('SELECT id FROM captures WHERE uid = ? LIMIT 1', [
    uid,
  ]);
  return rows.length > 0;
}

export async function deleteCaptureRow(id: number): Promise<StoredCapture | null> {
  const capture = await getCapture(id);
  if (!capture) {
    return null;
  }

  const db = await getReadyDb();
  await db.execute('DELETE FROM captures WHERE id = ?', [id]);
  return capture;
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

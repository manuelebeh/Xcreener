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
}

function rowToStored(row: CaptureRow): StoredCapture {
  return {
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    thumbnail: row.thumbnail,
    width: row.width,
    height: row.height,
    format: row.format,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export async function insertCapture(input: InsertCaptureInput): Promise<number> {
  const db = await getReadyDb();
  const result = await db.execute(
    `INSERT INTO captures (filename, filepath, thumbnail, width, height, format, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.filename,
      input.filepath,
      input.thumbnail,
      input.width,
      input.height,
      input.format ?? 'png',
      input.fileSize,
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

export async function listCaptures(limit = DEFAULT_MAX_CAPTURES): Promise<StoredCapture[]> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, created_at
     FROM captures ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map(rowToStored);
}

export async function getCapture(id: number): Promise<StoredCapture | null> {
  const db = await getReadyDb();
  const rows = await db.select<CaptureRow[]>(
    `SELECT id, filename, filepath, thumbnail, width, height, format, file_size, preset_used, tags, created_at
     FROM captures WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return row ? rowToStored(row) : null;
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

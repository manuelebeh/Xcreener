import { getDb } from './connection';
import { ensureMigrationsApplied } from './migrate';

async function getReadyDb() {
  await ensureMigrationsApplied();
  return getDb();
}

export interface StoredCollection {
  id: number;
  name: string;
  createdAt: string;
}

interface CollectionRow {
  id: number;
  name: string;
  created_at: string;
}

function rowToStored(row: CollectionRow): StoredCollection {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listCollections(): Promise<StoredCollection[]> {
  const db = await getReadyDb();
  const rows = await db.select<CollectionRow[]>(
    'SELECT id, name, created_at FROM collections ORDER BY name ASC'
  );
  return rows.map(rowToStored);
}

export async function createCollection(name: string): Promise<StoredCollection> {
  const db = await getReadyDb();
  await db.execute('INSERT INTO collections (name) VALUES (?)', [name.trim()]);
  const rows = await db.select<CollectionRow[]>(
    'SELECT id, name, created_at FROM collections WHERE name = ? LIMIT 1',
    [name.trim()]
  );
  const row = rows[0];
  if (!row) {
    throw new Error('Failed to create collection');
  }
  return rowToStored(row);
}

export async function renameCollection(id: number, name: string): Promise<void> {
  const db = await getReadyDb();
  await db.execute('UPDATE collections SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteCollection(id: number): Promise<void> {
  const db = await getReadyDb();
  await db.execute('DELETE FROM collections WHERE id = ?', [id]);
}

export async function addCaptureToCollection(captureId: number, collectionId: number): Promise<void> {
  const db = await getReadyDb();
  await db.execute(
    'INSERT OR IGNORE INTO capture_collections (capture_id, collection_id) VALUES (?, ?)',
    [captureId, collectionId]
  );
}

export async function removeCaptureFromCollection(
  captureId: number,
  collectionId: number
): Promise<void> {
  const db = await getReadyDb();
  await db.execute(
    'DELETE FROM capture_collections WHERE capture_id = ? AND collection_id = ?',
    [captureId, collectionId]
  );
}

export async function getCaptureCollectionIds(captureId: number): Promise<number[]> {
  const db = await getReadyDb();
  const rows = await db.select<{ collection_id: number }[]>(
    'SELECT collection_id FROM capture_collections WHERE capture_id = ?',
    [captureId]
  );
  return rows.map((row) => row.collection_id);
}

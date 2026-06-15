import Database from '@tauri-apps/plugin-sql';
import migrationSql from './migrations/001_init.sql?raw';

const DB_URL = 'sqlite:snapglow.db';

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute(migrationSql);

  const existing = await db.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = ?',
    ['theme']
  );

  if (existing.length === 0) {
    await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['theme', 'system']);
    if (import.meta.env.DEV) {
      console.info('[SnapGlow] Initialized setting theme=system');
    }
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

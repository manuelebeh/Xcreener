import Database from '@tauri-apps/plugin-sql';

export const DB_URL = 'sqlite:snapglow.db';

let dbPromise: Promise<Database> | null = null;
let initPromise: Promise<void> | null = null;

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

/** Ensures migrations ran before any query (safe to call multiple times). */
export async function ensureDbInitialized(runMigrations: () => Promise<void>): Promise<void> {
  if (!initPromise) {
    initPromise = runMigrations();
  }
  await initPromise;
}

/** @internal Test helper */
export function resetDbStateForTests(): void {
  dbPromise = null;
  initPromise = null;
}

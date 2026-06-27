import type Database from '@tauri-apps/plugin-sql';
import { DEFAULT_APP_SETTINGS, SETTING_KEYS } from '@/shared/types/settings';
import { ensureDbInitialized, getDb } from './connection';
import migration001 from './migrations/001_init.sql?raw';
import migration002 from './migrations/002_library_ocr.sql?raw';

const DEFAULT_SETTING_ENTRIES: Record<string, string> = {
  [SETTING_KEYS.theme]: DEFAULT_APP_SETTINGS.theme,
  [SETTING_KEYS.captureShortcut]: DEFAULT_APP_SETTINGS.captureShortcut,
  [SETTING_KEYS.launchAtLogin]: String(DEFAULT_APP_SETTINGS.launchAtLogin),
  [SETTING_KEYS.analyticsEnabled]: String(DEFAULT_APP_SETTINGS.analyticsEnabled),
  [SETTING_KEYS.autoRedaction]: String(DEFAULT_APP_SETTINGS.autoRedaction),
  [SETTING_KEYS.autoStyleSuggestion]: String(DEFAULT_APP_SETTINGS.autoStyleSuggestion),
  [SETTING_KEYS.smartCompression]: String(DEFAULT_APP_SETTINGS.smartCompression),
  [SETTING_KEYS.ocrEngine]: DEFAULT_APP_SETTINGS.ocrEngine,
  [SETTING_KEYS.ocrLanguages]: DEFAULT_APP_SETTINGS.ocrLanguages,
  [SETTING_KEYS.watermarkEnabled]: String(DEFAULT_APP_SETTINGS.watermarkEnabled),
  [SETTING_KEYS.watermarkDisplayName]: DEFAULT_APP_SETTINGS.watermarkDisplayName,
  [SETTING_KEYS.watermarkUrl]: DEFAULT_APP_SETTINGS.watermarkUrl,
  [SETTING_KEYS.watermarkPosition]: DEFAULT_APP_SETTINGS.watermarkPosition,
  [SETTING_KEYS.watermarkOpacity]: String(DEFAULT_APP_SETTINGS.watermarkOpacity),
  [SETTING_KEYS.watermarkLogoPath]: DEFAULT_APP_SETTINGS.watermarkLogoPath,
};

const MIGRATIONS: { version: number; sql: string }[] = [
  { version: 1, sql: migration001 },
  { version: 2, sql: migration002 },
];

/** Split a SQL migration file into executable statements (Tauri SQL runs one at a time). */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((statement) => statement.length > 0);
}

async function getAppliedVersion(db: Database): Promise<number> {
  const tableRows = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_migrations'"
  );

  if (tableRows.length === 0) {
    const legacy = await db.select<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='captures'"
    );
    return legacy.length > 0 ? 1 : 0;
  }

  const versions = await db.select<{ version: number }[]>(
    'SELECT MAX(version) as version FROM _schema_migrations'
  );
  return versions[0]?.version ?? 0;
}

async function seedMigrationVersion(db: Database, version: number): Promise<void> {
  const existing = await db.select<{ version: number }[]>(
    'SELECT version FROM _schema_migrations WHERE version = ?',
    [version]
  );
  if (existing.length === 0) {
    await db.execute('INSERT INTO _schema_migrations (version) VALUES (?)', [version]);
  }
}

async function applyMigrations(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  let currentVersion = await getAppliedVersion(db);
  if (currentVersion >= 1) {
    await seedMigrationVersion(db, 1);
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }

    const statements = splitSqlStatements(migration.sql);
    for (const statement of statements) {
      await db.execute(statement);
    }
    await db.execute('INSERT INTO _schema_migrations (version) VALUES (?)', [migration.version]);
    currentVersion = migration.version;
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTING_ENTRIES)) {
    const existing = await db.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );

    if (existing.length === 0) {
      await db.execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      if (import.meta.env.DEV) {
        console.info(`[SnapGlow] Initialized setting ${key}=${value}`);
      }
    }
  }
}

export async function ensureMigrationsApplied(): Promise<void> {
  await ensureDbInitialized(async () => {
    await applyMigrations(await getDb());
  });
}

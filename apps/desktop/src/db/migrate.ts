import type Database from '@tauri-apps/plugin-sql';
import { DEFAULT_APP_SETTINGS, SETTING_KEYS } from '@/shared/types/settings';
import { ensureDbInitialized, getDb } from './connection';
import migrationSql from './migrations/001_init.sql?raw';

const DEFAULT_SETTING_ENTRIES: Record<string, string> = {
  [SETTING_KEYS.theme]: DEFAULT_APP_SETTINGS.theme,
  [SETTING_KEYS.captureShortcut]: DEFAULT_APP_SETTINGS.captureShortcut,
  [SETTING_KEYS.launchAtLogin]: String(DEFAULT_APP_SETTINGS.launchAtLogin),
  [SETTING_KEYS.analyticsEnabled]: String(DEFAULT_APP_SETTINGS.analyticsEnabled),
  [SETTING_KEYS.autoRedaction]: String(DEFAULT_APP_SETTINGS.autoRedaction),
};

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

async function applyMigrations(db: Database): Promise<void> {
  const statements = splitSqlStatements(migrationSql);

  for (const statement of statements) {
    await db.execute(statement);
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

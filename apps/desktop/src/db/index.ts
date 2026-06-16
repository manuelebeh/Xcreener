import Database from '@tauri-apps/plugin-sql';
import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  SETTING_KEYS,
  type ThemePreference,
} from '@/shared/types/settings';
import migrationSql from './migrations/001_init.sql?raw';

const DB_URL = 'sqlite:snapglow.db';

const DEFAULT_SETTING_ENTRIES: Record<string, string> = {
  [SETTING_KEYS.theme]: DEFAULT_APP_SETTINGS.theme,
  [SETTING_KEYS.captureShortcut]: DEFAULT_APP_SETTINGS.captureShortcut,
  [SETTING_KEYS.launchAtLogin]: String(DEFAULT_APP_SETTINGS.launchAtLogin),
  [SETTING_KEYS.analyticsEnabled]: String(DEFAULT_APP_SETTINGS.analyticsEnabled),
  [SETTING_KEYS.autoRedaction]: String(DEFAULT_APP_SETTINGS.autoRedaction),
};

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

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) {
    return fallback;
  }
  return value === 'true';
}

export async function loadAppSettings(): Promise<AppSettings> {
  const [theme, captureShortcut, launchAtLogin, analyticsEnabled, autoRedaction] =
    await Promise.all([
      getSetting(SETTING_KEYS.theme),
      getSetting(SETTING_KEYS.captureShortcut),
      getSetting(SETTING_KEYS.launchAtLogin),
      getSetting(SETTING_KEYS.analyticsEnabled),
      getSetting(SETTING_KEYS.autoRedaction),
    ]);

  const resolvedTheme =
    theme && ['light', 'dark', 'system'].includes(theme)
      ? (theme as ThemePreference)
      : DEFAULT_APP_SETTINGS.theme;

  return {
    theme: resolvedTheme,
    captureShortcut: captureShortcut ?? DEFAULT_APP_SETTINGS.captureShortcut,
    launchAtLogin: parseBoolean(launchAtLogin, DEFAULT_APP_SETTINGS.launchAtLogin),
    analyticsEnabled: parseBoolean(analyticsEnabled, DEFAULT_APP_SETTINGS.analyticsEnabled),
    autoRedaction: parseBoolean(autoRedaction, DEFAULT_APP_SETTINGS.autoRedaction),
  };
}

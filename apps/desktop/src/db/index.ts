import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  SETTING_KEYS,
  type OcrEngineMode,
  type ThemePreference,
} from '@/shared/types/settings';
import { DB_URL, getDb } from './connection';
import { ensureMigrationsApplied } from './migrate';

export { DB_URL, getDb };

export async function initDatabase(): Promise<void> {
  await ensureMigrationsApplied();
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureMigrationsApplied();
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureMigrationsApplied();
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
  const [
    theme,
    captureShortcut,
    launchAtLogin,
    analyticsEnabled,
    autoRedaction,
    autoStyleSuggestion,
    smartCompression,
    ocrEngine,
    ocrLanguages,
  ] = await Promise.all([
    getSetting(SETTING_KEYS.theme),
    getSetting(SETTING_KEYS.captureShortcut),
    getSetting(SETTING_KEYS.launchAtLogin),
    getSetting(SETTING_KEYS.analyticsEnabled),
    getSetting(SETTING_KEYS.autoRedaction),
    getSetting(SETTING_KEYS.autoStyleSuggestion),
    getSetting(SETTING_KEYS.smartCompression),
    getSetting(SETTING_KEYS.ocrEngine),
    getSetting(SETTING_KEYS.ocrLanguages),
  ]);

  const resolvedTheme =
    theme && ['light', 'dark', 'system'].includes(theme)
      ? (theme as ThemePreference)
      : DEFAULT_APP_SETTINGS.theme;

  const resolvedOcrEngine =
    ocrEngine && ['auto', 'native', 'tesseract'].includes(ocrEngine)
      ? (ocrEngine as OcrEngineMode)
      : DEFAULT_APP_SETTINGS.ocrEngine;

  return {
    theme: resolvedTheme,
    captureShortcut: captureShortcut ?? DEFAULT_APP_SETTINGS.captureShortcut,
    launchAtLogin: parseBoolean(launchAtLogin, DEFAULT_APP_SETTINGS.launchAtLogin),
    analyticsEnabled: parseBoolean(analyticsEnabled, DEFAULT_APP_SETTINGS.analyticsEnabled),
    autoRedaction: parseBoolean(autoRedaction, DEFAULT_APP_SETTINGS.autoRedaction),
    autoStyleSuggestion: parseBoolean(
      autoStyleSuggestion,
      DEFAULT_APP_SETTINGS.autoStyleSuggestion
    ),
    smartCompression: parseBoolean(smartCompression, DEFAULT_APP_SETTINGS.smartCompression),
    ocrEngine: resolvedOcrEngine,
    ocrLanguages: ocrLanguages ?? DEFAULT_APP_SETTINGS.ocrLanguages,
  };
}

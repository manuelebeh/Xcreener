import { DEFAULT_APP_SETTINGS, SETTING_KEYS } from '@/shared/types/settings';
import { dbInit } from '@/tauri/commands';

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
  [SETTING_KEYS.activeWorkspaceId]: DEFAULT_APP_SETTINGS.activeWorkspaceId,
  [SETTING_KEYS.useTeamBrandKit]: String(DEFAULT_APP_SETTINGS.useTeamBrandKit),
};

let initPromise: Promise<void> | null = null;

/**
 * Rust opens `xcreener.db`, applies `migrations/*.sql` and inserts missing default settings
 * (`src-tauri/src/db`). Safe to call before every query.
 */
export function ensureMigrationsApplied(): Promise<void> {
  if (!initPromise) {
    initPromise = dbInit(DEFAULT_SETTING_ENTRIES);
  }
  return initPromise;
}

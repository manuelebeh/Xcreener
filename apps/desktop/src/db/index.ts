import {
  type AppLocale,
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  type OcrEngineMode,
  SETTING_KEYS,
  type ThemePreference,
  type WatermarkPosition,
} from '@/shared/types/settings';
import { dbSettingsGet, dbSettingsSet } from '@/tauri/commands';
import { ensureMigrationsApplied } from './migrate';

export async function initDatabase(): Promise<void> {
  await ensureMigrationsApplied();
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureMigrationsApplied();
  return dbSettingsGet(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureMigrationsApplied();
  await dbSettingsSet(key, value);
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
    locale,
    licenseSource,
    partnerCode,
    captureShortcut,
    launchAtLogin,
    analyticsEnabled,
    autoRedaction,
    autoStyleSuggestion,
    smartCompression,
    ocrEngine,
    ocrLanguages,
    watermarkEnabled,
    watermarkDisplayName,
    watermarkUrl,
    watermarkLogoPath,
    watermarkPosition,
    watermarkOpacity,
    activeWorkspaceId,
    useTeamBrandKit,
    cloudLibrarySync,
  ] = await Promise.all([
    getSetting(SETTING_KEYS.theme),
    getSetting(SETTING_KEYS.locale),
    getSetting(SETTING_KEYS.licenseSource),
    getSetting(SETTING_KEYS.partnerCode),
    getSetting(SETTING_KEYS.captureShortcut),
    getSetting(SETTING_KEYS.launchAtLogin),
    getSetting(SETTING_KEYS.analyticsEnabled),
    getSetting(SETTING_KEYS.autoRedaction),
    getSetting(SETTING_KEYS.autoStyleSuggestion),
    getSetting(SETTING_KEYS.smartCompression),
    getSetting(SETTING_KEYS.ocrEngine),
    getSetting(SETTING_KEYS.ocrLanguages),
    getSetting(SETTING_KEYS.watermarkEnabled),
    getSetting(SETTING_KEYS.watermarkDisplayName),
    getSetting(SETTING_KEYS.watermarkUrl),
    getSetting(SETTING_KEYS.watermarkLogoPath),
    getSetting(SETTING_KEYS.watermarkPosition),
    getSetting(SETTING_KEYS.watermarkOpacity),
    getSetting(SETTING_KEYS.activeWorkspaceId),
    getSetting(SETTING_KEYS.useTeamBrandKit),
    getSetting(SETTING_KEYS.cloudLibrarySync),
  ]);

  const resolvedTheme =
    theme && ['light', 'dark', 'system'].includes(theme)
      ? (theme as ThemePreference)
      : DEFAULT_APP_SETTINGS.theme;

  const resolvedOcrEngine =
    ocrEngine && ['auto', 'native', 'tesseract'].includes(ocrEngine)
      ? (ocrEngine as OcrEngineMode)
      : DEFAULT_APP_SETTINGS.ocrEngine;

  const resolvedWatermarkPosition =
    watermarkPosition &&
    ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(watermarkPosition)
      ? (watermarkPosition as WatermarkPosition)
      : DEFAULT_APP_SETTINGS.watermarkPosition;

  const resolvedWatermarkOpacity = watermarkOpacity
    ? Number.parseInt(watermarkOpacity, 10)
    : DEFAULT_APP_SETTINGS.watermarkOpacity;

  const resolvedLocale =
    locale && ['en', 'fr', 'de', 'ja'].includes(locale)
      ? (locale as AppLocale)
      : DEFAULT_APP_SETTINGS.locale;

  const resolvedLicenseSource =
    licenseSource && ['direct', 'setapp', 'appsumo', 'partner'].includes(licenseSource)
      ? (licenseSource as AppSettings['licenseSource'])
      : DEFAULT_APP_SETTINGS.licenseSource;

  return {
    theme: resolvedTheme,
    locale: resolvedLocale,
    licenseSource: resolvedLicenseSource,
    partnerCode: partnerCode ?? DEFAULT_APP_SETTINGS.partnerCode,
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
    watermarkEnabled: parseBoolean(watermarkEnabled, DEFAULT_APP_SETTINGS.watermarkEnabled),
    watermarkDisplayName: watermarkDisplayName ?? DEFAULT_APP_SETTINGS.watermarkDisplayName,
    watermarkUrl: watermarkUrl ?? DEFAULT_APP_SETTINGS.watermarkUrl,
    watermarkLogoPath: watermarkLogoPath ?? DEFAULT_APP_SETTINGS.watermarkLogoPath,
    watermarkPosition: resolvedWatermarkPosition,
    watermarkOpacity: Number.isFinite(resolvedWatermarkOpacity)
      ? resolvedWatermarkOpacity
      : DEFAULT_APP_SETTINGS.watermarkOpacity,
    activeWorkspaceId: activeWorkspaceId ?? DEFAULT_APP_SETTINGS.activeWorkspaceId,
    useTeamBrandKit: parseBoolean(useTeamBrandKit, DEFAULT_APP_SETTINGS.useTeamBrandKit),
    cloudLibrarySync: parseBoolean(cloudLibrarySync, DEFAULT_APP_SETTINGS.cloudLibrarySync),
  };
}

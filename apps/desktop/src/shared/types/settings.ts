export type ThemePreference = 'light' | 'dark' | 'system';
export type OcrEngineMode = 'auto' | 'native' | 'tesseract';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type AppLocale = 'en' | 'fr' | 'de' | 'ja';
export type LicenseSource = 'direct' | 'setapp' | 'appsumo' | 'partner';

export const DEFAULT_CAPTURE_SHORTCUT = 'CmdOrControl+Shift+KeyS';

export interface WatermarkSettings {
  watermarkEnabled: boolean;
  watermarkDisplayName: string;
  watermarkUrl: string;
  watermarkLogoPath: string;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
}

export interface AppSettings extends WatermarkSettings {
  theme: ThemePreference;
  locale: AppLocale;
  licenseSource: LicenseSource;
  partnerCode: string;
  captureShortcut: string;
  launchAtLogin: boolean;
  analyticsEnabled: boolean;
  autoRedaction: boolean;
  autoStyleSuggestion: boolean;
  smartCompression: boolean;
  ocrEngine: OcrEngineMode;
  ocrLanguages: string;
  activeWorkspaceId: string;
  useTeamBrandKit: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  locale: 'en',
  licenseSource: 'direct',
  partnerCode: '',
  captureShortcut: DEFAULT_CAPTURE_SHORTCUT,
  launchAtLogin: false,
  analyticsEnabled: false,
  autoRedaction: false,
  autoStyleSuggestion: true,
  smartCompression: true,
  ocrEngine: 'auto',
  ocrLanguages: 'eng',
  watermarkEnabled: true,
  watermarkDisplayName: 'SnapGlow',
  watermarkUrl: '',
  watermarkLogoPath: '',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 45,
  activeWorkspaceId: '',
  useTeamBrandKit: true,
};

export const SETTING_KEYS = {
  theme: 'theme',
  locale: 'locale',
  licenseSource: 'licenseSource',
  partnerCode: 'partnerCode',
  captureShortcut: 'captureShortcut',
  launchAtLogin: 'launchAtLogin',
  analyticsEnabled: 'analyticsEnabled',
  autoRedaction: 'autoRedaction',
  autoStyleSuggestion: 'autoStyleSuggestion',
  smartCompression: 'smartCompression',
  ocrEngine: 'ocrEngine',
  ocrLanguages: 'ocrLanguages',
  watermarkEnabled: 'watermarkEnabled',
  watermarkDisplayName: 'watermarkDisplayName',
  watermarkUrl: 'watermarkUrl',
  watermarkLogoPath: 'watermarkLogoPath',
  watermarkPosition: 'watermarkPosition',
  watermarkOpacity: 'watermarkOpacity',
  activeWorkspaceId: 'activeWorkspaceId',
  useTeamBrandKit: 'useTeamBrandKit',
  brandKitCache: 'brandKitCache',
  entitlementToken: 'entitlementToken',
} as const;

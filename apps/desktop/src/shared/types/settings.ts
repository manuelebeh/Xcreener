export type ThemePreference = 'light' | 'dark' | 'system';
export type OcrEngineMode = 'auto' | 'native' | 'tesseract';

export const DEFAULT_CAPTURE_SHORTCUT = 'CmdOrControl+Shift+KeyS';

export interface AppSettings {
  theme: ThemePreference;
  captureShortcut: string;
  launchAtLogin: boolean;
  analyticsEnabled: boolean;
  autoRedaction: boolean;
  autoStyleSuggestion: boolean;
  smartCompression: boolean;
  ocrEngine: OcrEngineMode;
  ocrLanguages: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  captureShortcut: DEFAULT_CAPTURE_SHORTCUT,
  launchAtLogin: false,
  analyticsEnabled: false,
  autoRedaction: false,
  autoStyleSuggestion: true,
  smartCompression: true,
  ocrEngine: 'auto',
  ocrLanguages: 'eng',
};

export const SETTING_KEYS = {
  theme: 'theme',
  captureShortcut: 'captureShortcut',
  launchAtLogin: 'launchAtLogin',
  analyticsEnabled: 'analyticsEnabled',
  autoRedaction: 'autoRedaction',
  autoStyleSuggestion: 'autoStyleSuggestion',
  smartCompression: 'smartCompression',
  ocrEngine: 'ocrEngine',
  ocrLanguages: 'ocrLanguages',
} as const;

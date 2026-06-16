export type ThemePreference = 'light' | 'dark' | 'system';

export const DEFAULT_CAPTURE_SHORTCUT = 'CmdOrControl+Shift+KeyS';

export interface AppSettings {
  theme: ThemePreference;
  captureShortcut: string;
  launchAtLogin: boolean;
  analyticsEnabled: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  captureShortcut: DEFAULT_CAPTURE_SHORTCUT,
  launchAtLogin: false,
  analyticsEnabled: false,
};

export const SETTING_KEYS = {
  theme: 'theme',
  captureShortcut: 'captureShortcut',
  launchAtLogin: 'launchAtLogin',
  analyticsEnabled: 'analyticsEnabled',
} as const;

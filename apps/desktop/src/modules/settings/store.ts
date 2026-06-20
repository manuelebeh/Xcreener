import { create } from 'zustand';
import type { AppSettings, ThemePreference } from '@/shared/types/settings';
import { DEFAULT_APP_SETTINGS } from '@/shared/types/settings';

interface SettingsState extends AppSettings {
  setTheme: (theme: ThemePreference) => void;
  setCaptureShortcut: (captureShortcut: string) => void;
  setLaunchAtLogin: (launchAtLogin: boolean) => void;
  setAnalyticsEnabled: (analyticsEnabled: boolean) => void;
  setAutoRedaction: (autoRedaction: boolean) => void;
  setAutoStyleSuggestion: (autoStyleSuggestion: boolean) => void;
  hydrate: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_APP_SETTINGS,
  setTheme: (theme) => set({ theme }),
  setCaptureShortcut: (captureShortcut) => set({ captureShortcut }),
  setLaunchAtLogin: (launchAtLogin) => set({ launchAtLogin }),
  setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
  setAutoRedaction: (autoRedaction) => set({ autoRedaction }),
  setAutoStyleSuggestion: (autoStyleSuggestion) => set({ autoStyleSuggestion }),
  hydrate: (settings) => set((state) => ({ ...state, ...settings })),
}));

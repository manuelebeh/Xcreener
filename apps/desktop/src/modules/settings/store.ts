import { create } from 'zustand';
import type { AppSettings, ThemePreference, WatermarkPosition } from '@/shared/types/settings';
import { DEFAULT_APP_SETTINGS } from '@/shared/types/settings';

interface SettingsState extends AppSettings {
  setTheme: (theme: ThemePreference) => void;
  setCaptureShortcut: (captureShortcut: string) => void;
  setLaunchAtLogin: (launchAtLogin: boolean) => void;
  setAnalyticsEnabled: (analyticsEnabled: boolean) => void;
  setAutoRedaction: (autoRedaction: boolean) => void;
  setAutoStyleSuggestion: (autoStyleSuggestion: boolean) => void;
  setSmartCompression: (smartCompression: boolean) => void;
  setOcrEngine: (ocrEngine: AppSettings['ocrEngine']) => void;
  setOcrLanguages: (ocrLanguages: string) => void;
  setWatermarkEnabled: (watermarkEnabled: boolean) => void;
  setWatermarkDisplayName: (watermarkDisplayName: string) => void;
  setWatermarkUrl: (watermarkUrl: string) => void;
  setWatermarkLogoPath: (watermarkLogoPath: string) => void;
  setWatermarkPosition: (watermarkPosition: WatermarkPosition) => void;
  setWatermarkOpacity: (watermarkOpacity: number) => void;
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
  setSmartCompression: (smartCompression) => set({ smartCompression }),
  setOcrEngine: (ocrEngine) => set({ ocrEngine }),
  setOcrLanguages: (ocrLanguages) => set({ ocrLanguages }),
  setWatermarkEnabled: (watermarkEnabled) => set({ watermarkEnabled }),
  setWatermarkDisplayName: (watermarkDisplayName) => set({ watermarkDisplayName }),
  setWatermarkUrl: (watermarkUrl) => set({ watermarkUrl }),
  setWatermarkLogoPath: (watermarkLogoPath) => set({ watermarkLogoPath }),
  setWatermarkPosition: (watermarkPosition) => set({ watermarkPosition }),
  setWatermarkOpacity: (watermarkOpacity) => set({ watermarkOpacity }),
  hydrate: (settings) => set((state) => ({ ...state, ...settings })),
}));

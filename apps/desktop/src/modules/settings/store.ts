import { create } from 'zustand';
import type { ThemePreference } from '@/shared/types/settings';

interface SettingsState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));

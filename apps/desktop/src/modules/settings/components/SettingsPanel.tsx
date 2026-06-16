import { Select } from '@snapglow/ui';
import { setSetting } from '@/db';
import type { ThemePreference } from '@/shared/types/settings';
import { useSettingsStore } from '../store';

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  async function handleThemeChange(value: ThemePreference) {
    setTheme(value);
    await setSetting('theme', value);
  }

  return (
    <div className="p-4">
      <h2 className="mt-0 text-lg font-semibold">Settings</h2>
      <label htmlFor="theme-select" className="block text-sm font-medium">
        Theme
        <Select
          id="theme-select"
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
          className="mt-2"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </label>
    </div>
  );
}

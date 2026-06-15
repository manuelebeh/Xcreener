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
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <label htmlFor="theme-select">
        Theme
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
          style={{ display: 'block', marginTop: 8, width: '100%' }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  );
}

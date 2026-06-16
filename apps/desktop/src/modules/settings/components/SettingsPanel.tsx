import { Button, Input, Select } from '@snapglow/ui';
import { useState } from 'react';
import { setSetting } from '@/db';
import { isAnalyticsActive } from '@/integrations/observability';
import { captureTestEvent } from '@/integrations/posthog/events';
import { updateCaptureShortcut } from '@/modules/capture/hooks/useGlobalShortcut';
import { isValidCaptureShortcut, normalizeCaptureShortcut } from '@/shared/lib/shortcut';
import type { ThemePreference } from '@/shared/types/settings';
import { SETTING_KEYS } from '@/shared/types/settings';
import { syncAutostart } from '../autostart';
import { useSettingsStore } from '../store';

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const captureShortcut = useSettingsStore((s) => s.captureShortcut);
  const launchAtLogin = useSettingsStore((s) => s.launchAtLogin);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setCaptureShortcut = useSettingsStore((s) => s.setCaptureShortcut);
  const setLaunchAtLogin = useSettingsStore((s) => s.setLaunchAtLogin);
  const setAnalyticsEnabled = useSettingsStore((s) => s.setAnalyticsEnabled);

  const [shortcutDraft, setShortcutDraft] = useState(captureShortcut);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [shortcutSaved, setShortcutSaved] = useState(false);

  async function handleThemeChange(value: ThemePreference) {
    setTheme(value);
    await setSetting(SETTING_KEYS.theme, value);
  }

  async function handleShortcutSave() {
    const normalized = normalizeCaptureShortcut(shortcutDraft);
    if (!isValidCaptureShortcut(normalized)) {
      setShortcutError('Use Tauri format, e.g. CmdOrControl+Shift+KeyS');
      setShortcutSaved(false);
      return;
    }

    try {
      await updateCaptureShortcut(normalized);
      setCaptureShortcut(normalized);
      await setSetting(SETTING_KEYS.captureShortcut, normalized);
      setShortcutDraft(normalized);
      setShortcutError(null);
      setShortcutSaved(true);
    } catch (error) {
      setShortcutError(error instanceof Error ? error.message : 'Failed to register shortcut');
      setShortcutSaved(false);
    }
  }

  async function handleLaunchAtLoginChange(enabled: boolean) {
    setLaunchAtLogin(enabled);
    await setSetting(SETTING_KEYS.launchAtLogin, String(enabled));
    await syncAutostart(enabled);
  }

  async function handleAnalyticsChange(enabled: boolean) {
    setAnalyticsEnabled(enabled);
    await setSetting(SETTING_KEYS.analyticsEnabled, String(enabled));
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="mt-0 text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted">System integration and preferences</p>
      </div>

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

      <div>
        <label htmlFor="capture-shortcut" className="block text-sm font-medium">
          Global capture shortcut
          <Input
            id="capture-shortcut"
            value={shortcutDraft}
            onChange={(e) => {
              setShortcutDraft(e.target.value);
              setShortcutSaved(false);
              setShortcutError(null);
            }}
            className="mt-2 font-mono text-xs"
            placeholder="CmdOrControl+Shift+KeyS"
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Tauri format: modifiers + key (e.g. CmdOrControl+Shift+KeyS)
        </p>
        {shortcutError ? <p className="mt-2 text-xs text-red-600">{shortcutError}</p> : null}
        {shortcutSaved ? (
          <p className="mt-2 text-xs text-green-700">Shortcut saved and registered.</p>
        ) : null}
        <Button type="button" className="mt-2" onClick={handleShortcutSave}>
          Save shortcut
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={launchAtLogin}
          onChange={(e) => handleLaunchAtLoginChange(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Launch at login
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={analyticsEnabled}
          onChange={(e) => handleAnalyticsChange(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Share anonymous usage data
      </label>
      {!import.meta.env.DEV ? (
        <p className="text-xs text-muted">Analytics are opt-in in production builds.</p>
      ) : null}

      {import.meta.env.DEV ? (
        <div className="rounded-md border border-border p-3">
          <p className="m-0 text-sm font-medium">Developer</p>
          <p className="mt-1 text-xs text-muted">
            Analytics active in dev: {isAnalyticsActive(analyticsEnabled) ? 'yes' : 'no'}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => captureTestEvent()}
          >
            Send test event
          </Button>
        </div>
      ) : null}
    </div>
  );
}

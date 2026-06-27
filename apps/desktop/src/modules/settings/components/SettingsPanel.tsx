import { Button, Input, Select } from '@snapglow/ui';
import { useState } from 'react';
import { setSetting } from '@/db';
import { isAnalyticsActive } from '@/integrations/observability';
import { captureTestEvent } from '@/integrations/posthog/events';
import { checkForAppUpdate } from '@/integrations/updater';
import { updateCaptureShortcut } from '@/modules/capture/hooks/useGlobalShortcut';
import { CloudAuthSection } from '@/modules/cloud/components/CloudAuthSection';
import { IntegrationsSection } from '@/modules/integrations/components/IntegrationsSection';
import { isValidCaptureShortcut, normalizeCaptureShortcut } from '@/shared/lib/shortcut';
import type { OcrEngineMode, ThemePreference } from '@/shared/types/settings';
import { SETTING_KEYS } from '@/shared/types/settings';
import { syncAutostart } from '../autostart';
import { useSettingsStore } from '../store';
import { WatermarkSection } from './WatermarkSection';

export function SettingsPanel() {
  const theme = useSettingsStore((s) => s.theme);
  const captureShortcut = useSettingsStore((s) => s.captureShortcut);
  const launchAtLogin = useSettingsStore((s) => s.launchAtLogin);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const autoRedaction = useSettingsStore((s) => s.autoRedaction);
  const autoStyleSuggestion = useSettingsStore((s) => s.autoStyleSuggestion);
  const smartCompression = useSettingsStore((s) => s.smartCompression);
  const ocrEngine = useSettingsStore((s) => s.ocrEngine);
  const ocrLanguages = useSettingsStore((s) => s.ocrLanguages);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setCaptureShortcut = useSettingsStore((s) => s.setCaptureShortcut);
  const setLaunchAtLogin = useSettingsStore((s) => s.setLaunchAtLogin);
  const setAnalyticsEnabled = useSettingsStore((s) => s.setAnalyticsEnabled);
  const setAutoRedaction = useSettingsStore((s) => s.setAutoRedaction);
  const setAutoStyleSuggestion = useSettingsStore((s) => s.setAutoStyleSuggestion);
  const setSmartCompression = useSettingsStore((s) => s.setSmartCompression);
  const setOcrEngine = useSettingsStore((s) => s.setOcrEngine);
  const setOcrLanguages = useSettingsStore((s) => s.setOcrLanguages);

  const [shortcutDraft, setShortcutDraft] = useState(captureShortcut);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [shortcutSaved, setShortcutSaved] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

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

  async function handleAutoRedactionChange(enabled: boolean) {
    setAutoRedaction(enabled);
    await setSetting(SETTING_KEYS.autoRedaction, String(enabled));
  }

  async function handleAutoStyleSuggestionChange(enabled: boolean) {
    setAutoStyleSuggestion(enabled);
    await setSetting(SETTING_KEYS.autoStyleSuggestion, String(enabled));
  }

  async function handleSmartCompressionChange(enabled: boolean) {
    setSmartCompression(enabled);
    await setSetting(SETTING_KEYS.smartCompression, String(enabled));
  }

  async function handleOcrEngineChange(value: OcrEngineMode) {
    setOcrEngine(value);
    await setSetting(SETTING_KEYS.ocrEngine, value);
  }

  async function handleOcrLanguagesChange(value: string) {
    setOcrLanguages(value);
    await setSetting(SETTING_KEYS.ocrLanguages, value);
  }

  async function handleCheckForUpdates() {
    setUpdateLoading(true);
    setUpdateStatus(null);

    const result = await checkForAppUpdate({ install: true });

    switch (result.status) {
      case 'unavailable':
        setUpdateStatus('Updates are only available in the desktop app.');
        break;
      case 'current':
        setUpdateStatus('You are on the latest version.');
        break;
      case 'available':
        setUpdateStatus(`Update ${result.version} found - installing…`);
        break;
      case 'error':
        setUpdateStatus(result.message);
        break;
    }

    setUpdateLoading(false);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted">System integration and preferences</p>
      </header>

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
            aria-invalid={shortcutError ? true : undefined}
            aria-describedby={
              shortcutError
                ? 'capture-shortcut-error'
                : shortcutSaved
                  ? 'capture-shortcut-success'
                  : 'capture-shortcut-hint'
            }
          />
        </label>
        <p id="capture-shortcut-hint" className="mt-1 text-xs text-muted">
          Tauri format: modifiers + key (e.g. CmdOrControl+Shift+KeyS)
        </p>
        {shortcutError ? (
          <p id="capture-shortcut-error" className="mt-2 text-xs text-destructive" role="alert">
            {shortcutError}
          </p>
        ) : null}
        {shortcutSaved ? (
          <p id="capture-shortcut-success" className="mt-2 text-xs text-success" role="status">
            Shortcut saved and registered.
          </p>
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
          className="sg-focus-ring size-4 rounded border-border"
        />
        Launch at login
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={analyticsEnabled}
          onChange={(e) => handleAnalyticsChange(e.target.checked)}
          className="sg-focus-ring size-4 rounded border-border"
        />
        Share anonymous usage data
      </label>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={autoRedaction}
          onChange={(e) => handleAutoRedactionChange(e.target.checked)}
          className="sg-focus-ring size-4 rounded border-border"
          data-testid="auto-redaction-toggle"
        />
        Automatically mask sensitive data after capture
      </label>
      <p className="text-xs text-muted">
        On-device OCR scan runs when a screenshot opens in the editor.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={autoStyleSuggestion}
          onChange={(e) => handleAutoStyleSuggestionChange(e.target.checked)}
          className="sg-focus-ring size-4 rounded border-border"
          data-testid="auto-style-suggestion-toggle"
        />
        Suggest style when a screenshot opens
      </label>
      <p className="text-xs text-muted">
        On-device classification suggests a matching background and padding. Apply manually in one
        click.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={smartCompression}
          onChange={(e) => handleSmartCompressionChange(e.target.checked)}
          className="sg-focus-ring size-4 rounded border-border"
          data-testid="smart-compression-toggle"
        />
        Smart export compression
      </label>
      <p className="text-xs text-muted">
        Uses pngquant-style palette reduction and optimized JPEG/WebP encoding on export.
      </p>

      <div>
        <label htmlFor="ocr-engine" className="block text-sm font-medium">
          OCR engine
          <Select
            id="ocr-engine"
            value={ocrEngine}
            onChange={(e) => handleOcrEngineChange(e.target.value as OcrEngineMode)}
            className="mt-2"
            data-testid="ocr-engine-select"
          >
            <option value="auto">Auto (native first)</option>
            <option value="native">Native (Vision / Windows OCR)</option>
            <option value="tesseract">Tesseract CLI</option>
          </Select>
        </label>
      </div>

      <div>
        <label htmlFor="ocr-languages" className="block text-sm font-medium">
          OCR languages
          <Input
            id="ocr-languages"
            value={ocrLanguages}
            onChange={(e) => handleOcrLanguagesChange(e.target.value)}
            className="mt-2 font-mono text-xs"
            placeholder="eng+fra+deu+jpn"
            data-testid="ocr-languages-input"
          />
        </label>
        <p className="mt-1 text-xs text-muted">Tesseract language codes joined with +</p>
      </div>

      <CloudAuthSection />

      <IntegrationsSection />

      <WatermarkSection />

      {!import.meta.env.DEV ? (
        <p className="text-xs text-muted">Analytics are opt-in in production builds.</p>
      ) : null}

      <div className="rounded-md border border-border p-3">
        <p className="m-0 text-sm font-medium">Updates</p>
        <p className="mt-1 text-xs text-muted">Check GitHub Releases for new builds.</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          disabled={updateLoading}
          onClick={handleCheckForUpdates}
        >
          {updateLoading ? 'Checking…' : 'Check for updates'}
        </Button>
        {updateStatus ? <p className="mt-2 text-xs text-muted">{updateStatus}</p> : null}
      </div>

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

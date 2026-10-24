import { LOCALE_LABELS, SUPPORTED_LOCALES, useTranslation } from '@snapglow/i18n';
import { Button, Input, Select } from '@snapglow/ui';
import { useState } from 'react';
import { setSetting } from '@/db';
import { isAnalyticsActive } from '@/integrations/observability';
import { captureTestEvent } from '@/integrations/posthog/events';
import { checkForAppUpdate } from '@/integrations/updater';
import { updateCaptureShortcut } from '@/modules/capture/hooks/useGlobalShortcut';
import { CloudAuthSection } from '@/modules/cloud/components/CloudAuthSection';
import { IntegrationsSection } from '@/modules/integrations/components/IntegrationsSection';
import { MarketplaceSection } from '@/modules/marketplace/components/MarketplaceSection';
import { TeamOnboardingWizard } from '@/modules/team/components/TeamOnboardingWizard';
import { TeamSection } from '@/modules/team/components/TeamSection';
import { loadTeamOnboardingState } from '@/modules/team/onboarding';
import { SettingsGroup, SettingsRow, SettingsToggle } from '@/shared/components/SettingsGroup';
import { isValidCaptureShortcut, normalizeCaptureShortcut } from '@/shared/lib/shortcut';
import type { AppLocale, OcrEngineMode, ThemePreference } from '@/shared/types/settings';
import { SETTING_KEYS } from '@/shared/types/settings';
import { syncAutostart } from '../autostart';
import { useSettingsStore } from '../store';
import { WatermarkSection } from './WatermarkSection';

export function SettingsPanel() {
  const { t } = useTranslation('settings');
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const captureShortcut = useSettingsStore((s) => s.captureShortcut);
  const launchAtLogin = useSettingsStore((s) => s.launchAtLogin);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const autoRedaction = useSettingsStore((s) => s.autoRedaction);
  const autoStyleSuggestion = useSettingsStore((s) => s.autoStyleSuggestion);
  const smartCompression = useSettingsStore((s) => s.smartCompression);
  const ocrEngine = useSettingsStore((s) => s.ocrEngine);
  const ocrLanguages = useSettingsStore((s) => s.ocrLanguages);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] =
    useState<import('@/modules/team/onboarding').TeamOnboardingStep>('welcome');

  async function handleLocaleChange(value: AppLocale) {
    setLocale(value);
    await setSetting(SETTING_KEYS.locale, value);
  }

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
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted">System integration and preferences</p>
      </header>

      <SettingsGroup title="General">
        <SettingsRow label="Theme" htmlFor="theme-select">
          <div className="w-44">
            <Select
              id="theme-select"
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
        </SettingsRow>
        <SettingsRow label={t('language')} hint={t('languageHint')} htmlFor="locale-select">
          <div className="w-44">
            <Select
              id="locale-select"
              value={locale}
              onChange={(e) => void handleLocaleChange(e.target.value as AppLocale)}
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </Select>
          </div>
        </SettingsRow>
        <SettingsToggle
          id="launch-at-login"
          label="Launch at login"
          checked={launchAtLogin}
          onChange={handleLaunchAtLoginChange}
        />
      </SettingsGroup>

      <SettingsGroup title="Capture">
        <SettingsRow
          label="Global capture shortcut"
          hint="Tauri format: modifiers + key (e.g. CmdOrControl+Shift+KeyS)"
          htmlFor="capture-shortcut"
          footer={
            <>
              {shortcutError ? (
                <p id="capture-shortcut-error" className="text-xs text-destructive" role="alert">
                  {shortcutError}
                </p>
              ) : null}
              {shortcutSaved ? (
                <p id="capture-shortcut-success" className="text-xs text-success" role="status">
                  Shortcut saved and registered.
                </p>
              ) : null}
            </>
          }
        >
          <div className="w-72">
            <Input
              id="capture-shortcut"
              value={shortcutDraft}
              onChange={(e) => {
                setShortcutDraft(e.target.value);
                setShortcutSaved(false);
                setShortcutError(null);
              }}
              className="font-mono text-xs"
              placeholder="CmdOrControl+Shift+KeyS"
              aria-invalid={shortcutError ? true : undefined}
              aria-describedby={
                shortcutError
                  ? 'capture-shortcut-error'
                  : shortcutSaved
                    ? 'capture-shortcut-success'
                    : undefined
              }
            />
          </div>
          <Button type="button" variant="secondary" onClick={handleShortcutSave}>
            Save shortcut
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Privacy and automation">
        <SettingsToggle
          id="analytics-enabled"
          label="Share anonymous usage data"
          checked={analyticsEnabled}
          onChange={handleAnalyticsChange}
        />
        <SettingsToggle
          id="auto-redaction"
          label="Automatically mask sensitive data after capture"
          hint="On-device OCR scan runs when a screenshot opens in the editor."
          checked={autoRedaction}
          onChange={handleAutoRedactionChange}
          testId="auto-redaction-toggle"
        />
        <SettingsToggle
          id="auto-style-suggestion"
          label="Suggest style when a screenshot opens"
          hint="On-device classification suggests a matching background and padding. Apply manually in one click."
          checked={autoStyleSuggestion}
          onChange={handleAutoStyleSuggestionChange}
          testId="auto-style-suggestion-toggle"
        />
        <SettingsToggle
          id="smart-compression"
          label="Smart export compression"
          hint="Uses pngquant-style palette reduction and optimized JPEG/WebP encoding on export."
          checked={smartCompression}
          onChange={handleSmartCompressionChange}
          testId="smart-compression-toggle"
        />
      </SettingsGroup>

      <SettingsGroup title="Text recognition">
        <SettingsRow label="OCR engine" htmlFor="ocr-engine">
          <div className="w-60">
            <Select
              id="ocr-engine"
              value={ocrEngine}
              onChange={(e) => handleOcrEngineChange(e.target.value as OcrEngineMode)}
              data-testid="ocr-engine-select"
            >
              <option value="auto">Auto (native first)</option>
              <option value="native">Native (Vision / Windows OCR)</option>
              <option value="tesseract">Tesseract CLI</option>
            </Select>
          </div>
        </SettingsRow>
        <SettingsRow
          label="OCR languages"
          hint="Tesseract language codes joined with +"
          htmlFor="ocr-languages"
        >
          <div className="w-60">
            <Input
              id="ocr-languages"
              value={ocrLanguages}
              onChange={(e) => handleOcrLanguagesChange(e.target.value)}
              className="font-mono text-xs"
              placeholder="eng+fra+deu+jpn"
              data-testid="ocr-languages-input"
            />
          </div>
        </SettingsRow>
      </SettingsGroup>

      <CloudAuthSection />

      <SettingsGroup title="Team">
        <SettingsRow
          label="Team setup guide"
          hint="Walk through workspace creation, billing, brand kit, and invites."
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void loadTeamOnboardingState().then((state) => {
                setOnboardingStep(state.step);
                setOnboardingOpen(true);
              });
            }}
          >
            Open setup guide
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <TeamSection />

      <TeamOnboardingWizard
        open={onboardingOpen}
        initialStep={onboardingStep}
        onClose={() => setOnboardingOpen(false)}
        onCompleted={() => setOnboardingOpen(false)}
      />

      <IntegrationsSection />

      <MarketplaceSection />

      <WatermarkSection />

      {!import.meta.env.DEV ? (
        <p className="text-xs text-muted">Analytics are opt-in in production builds.</p>
      ) : null}

      <SettingsGroup title="Updates">
        <SettingsRow
          label="Check for updates"
          hint="Check GitHub Releases for new builds."
          footer={updateStatus ? <p className="text-xs text-muted">{updateStatus}</p> : null}
        >
          <Button
            type="button"
            variant="secondary"
            disabled={updateLoading}
            onClick={handleCheckForUpdates}
          >
            {updateLoading ? 'Checking…' : 'Check for updates'}
          </Button>
        </SettingsRow>
      </SettingsGroup>

      {import.meta.env.DEV ? (
        <SettingsGroup title="Developer">
          <SettingsRow
            label="Send test event"
            hint={`Analytics active in dev: ${isAnalyticsActive(analyticsEnabled) ? 'yes' : 'no'}`}
          >
            <Button type="button" variant="secondary" onClick={() => captureTestEvent()}>
              Send test event
            </Button>
          </SettingsRow>
        </SettingsGroup>
      ) : null}
    </div>
  );
}

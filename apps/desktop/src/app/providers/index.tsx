import { SnapGlowI18nProvider } from '@snapglow/i18n';
import { ThemeProvider } from '@snapglow/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { initDatabase, loadAppSettings, setSetting } from '@/db';
import { initObservability } from '@/integrations/observability';
import { captureAppStarted } from '@/integrations/posthog/events';
import { PostHogProvider } from '@/integrations/posthog/provider';
import { checkForAppUpdate } from '@/integrations/updater';
import { updateCaptureShortcut } from '@/modules/capture/hooks/updateCaptureShortcut';
import { detectLicenseSource } from '@/modules/licensing/detectLicenseSource';
import { loadStoredEntitlement, refreshEntitlement } from '@/modules/licensing/entitlement';
import { syncAutostart } from '@/modules/settings/autostart';
import { useSettingsStore } from '@/modules/settings/store';
import { TeamOnboardingHost } from '@/modules/team/components/TeamOnboardingHost';
import { hydrateTeamFromSettings } from '@/modules/team/store';
import { isTauriRuntime } from '@/shared/lib/tauri';
import type { ThemePreference } from '@/shared/types/settings';
import { SETTING_KEYS } from '@/shared/types/settings';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [ready, setReady] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (isTauriRuntime()) {
        await initDatabase();
        const settings = await loadAppSettings();
        const detectedLicense = detectLicenseSource();
        if (detectedLicense !== settings.licenseSource) {
          settings.licenseSource = detectedLicense;
          await setSetting(SETTING_KEYS.licenseSource, detectedLicense);
        }
        if (!cancelled) {
          hydrate(settings);
          await hydrateTeamFromSettings(settings.activeWorkspaceId || null);
          await loadStoredEntitlement();
          refreshEntitlement().catch((error) => {
            console.debug('[SnapGlow] Entitlement refresh skipped', error);
          });
        }

        try {
          await updateCaptureShortcut(settings.captureShortcut);
        } catch (error) {
          console.error('[SnapGlow] Failed to register capture shortcut', error);
        }

        try {
          await syncAutostart(settings.launchAtLogin);
        } catch (error) {
          console.error('[SnapGlow] Failed to sync autostart', error);
        }

        checkForAppUpdate({ silent: true }).catch((error) => {
          console.debug('[SnapGlow] Startup update check skipped', error);
        });
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    bootstrap().catch((error) => {
      console.error('[SnapGlow] Failed to initialize app', error);
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    initObservability(analyticsEnabled);
    captureAppStarted();
  }, [ready, analyticsEnabled]);

  const handleThemeChange = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
    },
    [setTheme]
  );

  if (!ready) {
    return (
      <div className="min-h-screen bg-background p-6 font-sans text-foreground">
        Loading SnapGlow…
      </div>
    );
  }

  return (
    <SnapGlowI18nProvider locale={locale}>
      <PostHogProvider>
        <ThemeProvider theme={theme} onThemeChange={handleThemeChange}>
          <TeamOnboardingHost />
          {children}
        </ThemeProvider>
      </PostHogProvider>
    </SnapGlowI18nProvider>
  );
}

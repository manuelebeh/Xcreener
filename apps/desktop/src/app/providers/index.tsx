import { ThemeProvider } from '@snapglow/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { initDatabase, loadAppSettings } from '@/db';
import { hydrateTeamFromSettings } from '@/modules/team/store';
import { initObservability } from '@/integrations/observability';
import { captureAppStarted } from '@/integrations/posthog/events';
import { PostHogProvider } from '@/integrations/posthog/provider';
import { checkForAppUpdate } from '@/integrations/updater';
import { updateCaptureShortcut } from '@/modules/capture/hooks/updateCaptureShortcut';
import { syncAutostart } from '@/modules/settings/autostart';
import { useSettingsStore } from '@/modules/settings/store';
import { isTauriRuntime } from '@/shared/lib/tauri';
import type { ThemePreference } from '@/shared/types/settings';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [ready, setReady] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const analyticsEnabled = useSettingsStore((s) => s.analyticsEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (isTauriRuntime()) {
        await initDatabase();
        const settings = await loadAppSettings();
        if (!cancelled) {
          hydrate(settings);
          await hydrateTeamFromSettings(settings.activeWorkspaceId || null);
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
    <PostHogProvider>
      <ThemeProvider theme={theme} onThemeChange={handleThemeChange}>
        {children}
      </ThemeProvider>
    </PostHogProvider>
  );
}

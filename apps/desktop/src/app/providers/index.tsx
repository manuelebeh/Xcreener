import { ThemeProvider } from '@snapglow/ui';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { getSetting, initDatabase } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';
import type { ThemePreference } from '@/shared/types/settings';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [ready, setReady] = useState(false);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await initDatabase();
      const storedTheme = await getSetting('theme');
      if (!cancelled && storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setTheme(storedTheme as ThemePreference);
      }
      if (!cancelled) {
        setReady(true);
      }
    }

    bootstrap().catch((error) => {
      console.error('[SnapGlow] Failed to initialize database', error);
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  const handleThemeChange = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
    },
    [setTheme]
  );

  if (!ready) {
    return <div className="p-6 font-sans text-foreground">Loading SnapGlow…</div>;
  }

  return (
    <ThemeProvider theme={theme} onThemeChange={handleThemeChange}>
      {children}
    </ThemeProvider>
  );
}

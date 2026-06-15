import { type ReactNode, useEffect, useState } from 'react';
import { getSetting, initDatabase } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [ready, setReady] = useState(false);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      await initDatabase();
      const theme = await getSetting('theme');
      if (!cancelled && theme && ['light', 'dark', 'system'].includes(theme)) {
        setTheme(theme as 'light' | 'dark' | 'system');
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

  if (!ready) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>Loading SnapGlow…</div>
    );
  }

  return children;
}

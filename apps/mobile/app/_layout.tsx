import { ThemeProvider as SnapGlowThemeProvider } from '@snapglow/ui-native';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useShareImport } from '@/modules/capture/hooks/useShareImport';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function ShareImportListener() {
  useShareImport();
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ShareIntentProvider>
      <SnapGlowThemeProvider>
        <ShareImportListener />
        <Stack>
          <Stack.Screen name="index" options={{ title: 'SnapGlow' }} />
          <Stack.Screen name="import" options={{ title: 'Import' }} />
        </Stack>
      </SnapGlowThemeProvider>
    </ShareIntentProvider>
  );
}

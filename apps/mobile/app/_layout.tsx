import { SnapGlowI18nProvider } from '@snapglow/i18n';
import { ThemeProvider as SnapGlowThemeProvider } from '@snapglow/ui-native';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { bootstrapAccount } from '@/modules/account';
import { useShareImport } from '@/modules/capture/hooks/useShareImport';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function ShareImportListener() {
  useShareImport();
  return null;
}

function AccountBootstrap() {
  useEffect(() => {
    bootstrapAccount().catch((error) => {
      console.debug('[SnapGlow] Account bootstrap skipped', error);
    });
  }, []);
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareIntentProvider>
        <SnapGlowI18nProvider>
          <SnapGlowThemeProvider>
            <ShareImportListener />
            <AccountBootstrap />
            <Stack>
              <Stack.Screen name="index" options={{ title: 'SnapGlow' }} />
              <Stack.Screen name="import" options={{ title: 'Import' }} />
              <Stack.Screen name="editor" options={{ title: 'Editor' }} />
            </Stack>
          </SnapGlowThemeProvider>
        </SnapGlowI18nProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}

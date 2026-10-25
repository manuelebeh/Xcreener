import { XcreenerI18nProvider } from '@xcreener/i18n';
import { ThemeProvider as XcreenerThemeProvider } from '@xcreener/ui-native';
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
      console.debug('[Xcreener] Account bootstrap skipped', error);
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
        <XcreenerI18nProvider>
          <XcreenerThemeProvider>
            <ShareImportListener />
            <AccountBootstrap />
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Xcreener' }} />
              <Stack.Screen name="import" options={{ title: 'Import' }} />
              <Stack.Screen name="editor" options={{ title: 'Editor' }} />
            </Stack>
          </XcreenerThemeProvider>
        </XcreenerI18nProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}

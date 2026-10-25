import type { ExpoConfig } from 'expo/config';

const isProduction = process.env.APP_VARIANT === 'production';

const config: ExpoConfig = {
  name: 'Xcreener',
  slug: 'xcreener',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'xcreener',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.xcreener.app',
    buildNumber: '1',
    infoPlist: {
      NSPhotoLibraryAddUsageDescription: 'Xcreener saves edited screenshots to your photo library.',
    },
  },
  android: {
    package: 'com.xcreener.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ...(isProduction ? [] : (['expo-dev-client'] as const)),
    'expo-image',
    'expo-sharing',
    'expo-web-browser',
    'expo-secure-store',
    [
      'expo-media-library',
      {
        // Save-only (saveToPhotos asks for write access): false keeps the read key out of Info.plist.
        photosPermission: false,
        savePhotosPermission: 'Allow Xcreener to save edited screenshots to your photo library.',
      },
    ],
    [
      'expo-share-intent',
      {
        iosActivationRules: {
          NSExtensionActivationSupportsImageWithMaxCount: 1,
        },
        androidIntentFilters: ['image/*'],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '123fa91e-16a5-4934-b239-0fd53b83eeb9',
    },
  },
};

export default config;

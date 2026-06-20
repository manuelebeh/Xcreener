import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SnapGlow',
  slug: 'snapglow',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'snapglow',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.snapglow.app',
    infoPlist: {
      NSPhotoLibraryAddUsageDescription: 'SnapGlow saves edited screenshots to your photo library.',
      NSPhotoLibraryUsageDescription: 'SnapGlow saves edited screenshots to your photo library.',
    },
  },
  android: {
    package: 'com.snapglow.app',
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
    'expo-dev-client',
    'expo-image',
    'expo-sharing',
    [
      'expo-media-library',
      {
        photosPermission: 'Allow SnapGlow to save edited screenshots to your photo library.',
        savePhotosPermission: 'Allow SnapGlow to save edited screenshots to your photo library.',
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
};

export default config;

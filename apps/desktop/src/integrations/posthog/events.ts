import posthog from 'posthog-js';
import { isAnalyticsActive } from '@/integrations/observability';
import { useSettingsStore } from '@/modules/settings/store';

export function captureAppStarted(): void {
  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;
  if (!isAnalyticsActive(analyticsEnabled) || !posthog.__loaded) {
    return;
  }

  posthog.capture('app_started', {
    surface: 'desktop',
    environment: import.meta.env.MODE,
  });
}

export function captureTestEvent(): void {
  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;
  if (!isAnalyticsActive(analyticsEnabled) || !posthog.__loaded) {
    if (import.meta.env.DEV) {
      console.info('[SnapGlow] Skipped test event — analytics not active');
    }
    return;
  }

  posthog.capture('app_test_event', {
    surface: 'desktop',
    source: 'settings_dev_button',
  });
}

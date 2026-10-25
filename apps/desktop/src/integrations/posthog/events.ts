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
      console.info('[Xcreener] Skipped test event - analytics not active');
    }
    return;
  }

  posthog.capture('app_test_event', {
    surface: 'desktop',
    source: 'settings_dev_button',
  });
}

export function captureUpdateChecked(
  analyticsEnabled: boolean,
  properties: { result: string; version?: string; message?: string }
): void {
  if (!isAnalyticsActive(analyticsEnabled) || !posthog.__loaded) {
    return;
  }

  posthog.capture('update_checked', {
    surface: 'desktop',
    ...properties,
  });
}

export function captureExportCompleted(properties: {
  format: string;
  file_size: number;
  duration_ms: number;
}): void {
  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;
  if (!isAnalyticsActive(analyticsEnabled) || !posthog.__loaded) {
    return;
  }

  posthog.capture('export_completed', {
    surface: 'desktop',
    ...properties,
  });
}

export function captureRedactionTriggered(properties: {
  auto_or_manual: 'auto' | 'manual';
  types_detected: string[];
  count: number;
}): void {
  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;
  if (!isAnalyticsActive(analyticsEnabled) || !posthog.__loaded) {
    return;
  }

  posthog.capture('redaction_triggered', {
    surface: 'desktop',
    ...properties,
  });
}

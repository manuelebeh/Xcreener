import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';

let initialized = false;

export function isAnalyticsActive(analyticsEnabled: boolean): boolean {
  const hasPostHogKey = Boolean(import.meta.env.VITE_POSTHOG_KEY);
  const hasSentryDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);

  if (!hasPostHogKey && !hasSentryDsn) {
    return false;
  }

  if (import.meta.env.DEV) {
    return true;
  }

  return analyticsEnabled;
}

export function initObservability(analyticsEnabled: boolean): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  if (!isAnalyticsActive(analyticsEnabled)) {
    return;
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (posthogKey && !posthog.__loaded) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: false,
      autocapture: false,
    });
  }

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
    });
  }

  initialized = true;
}

export function resetObservabilityForTests(): void {
  initialized = false;
}

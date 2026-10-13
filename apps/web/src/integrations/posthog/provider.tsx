import { PostHogProvider as BasePostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';

const CAPABILITY_URL_PATTERN = /^\/(s|e|c)\//;

if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    defaults: '2025-11-30',
    // Nothing is sent or stored until the visitor accepts in the ConsentBanner.
    opt_out_capturing_by_default: true,
    // Share, embed, and collab URLs are bearer links: never send them to analytics.
    before_send: (event) =>
      event && CAPABILITY_URL_PATTERN.test(window.location.pathname) ? null : event,
  });
}

interface PostHogProviderProps {
  children: ReactNode;
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}

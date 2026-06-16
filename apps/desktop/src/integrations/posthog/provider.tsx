import { PostHogProvider as BasePostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import type { ReactNode } from 'react';

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  if (!import.meta.env.VITE_POSTHOG_KEY) {
    return children;
  }

  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}

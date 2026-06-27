import { useFeatureFlagVariantKey } from 'posthog-js/react';

export type PricingExperimentVariant = 'control' | 'highlight_pro';

export function usePricingExperiment(): PricingExperimentVariant {
  const variant = useFeatureFlagVariantKey('pricing-hero-v1');
  if (variant === 'highlight_pro') {
    return 'highlight_pro';
  }
  return 'control';
}

export function useLandingCtaExperiment(): 'download' | 'trial' {
  const variant = useFeatureFlagVariantKey('landing-cta-v1');
  return variant === 'trial' ? 'trial' : 'download';
}

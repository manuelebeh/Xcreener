import posthog from 'posthog-js';
import { isAnalyticsActive } from '@/integrations/observability';
import { useSettingsStore } from '@/modules/settings/store';

export type OnboardingExperimentVariant = 'default' | 'skip_brand_kit';

function canUseExperiments(): boolean {
  const analyticsEnabled = useSettingsStore.getState().analyticsEnabled;
  return isAnalyticsActive(analyticsEnabled) && posthog.__loaded;
}

export function getOnboardingExperimentVariant(): OnboardingExperimentVariant {
  if (!canUseExperiments()) {
    return 'default';
  }
  const variant = posthog.getFeatureFlag('team-onboarding-v1');
  return variant === 'skip_brand_kit' ? 'skip_brand_kit' : 'default';
}

export function captureExperimentExposure(experiment: string, variant: string): void {
  if (!canUseExperiments()) {
    return;
  }
  posthog.capture('experiment_exposure', { experiment, variant, surface: 'desktop' });
}

export function capturePaywallConverted(plan: string): void {
  if (!canUseExperiments()) {
    return;
  }
  posthog.capture('paywall_converted', { plan, surface: 'desktop' });
}

export function captureOnboardingStepCompleted(step: string): void {
  if (!canUseExperiments()) {
    return;
  }
  posthog.capture('onboarding_step_completed', { step, surface: 'desktop' });
}

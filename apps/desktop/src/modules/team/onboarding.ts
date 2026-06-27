import { getSetting, setSetting } from '@/db';

export const TEAM_ONBOARDING_KEYS = {
  completed: 'teamOnboardingCompleted',
  step: 'teamOnboardingStep',
} as const;

export const TEAM_ONBOARDING_STEPS = [
  'welcome',
  'cloud-auth',
  'create-workspace',
  'plan',
  'brand-kit',
  'invite',
  'api-plugins',
] as const;

export type TeamOnboardingStep = (typeof TEAM_ONBOARDING_STEPS)[number];

export interface TeamOnboardingState {
  completed: boolean;
  step: TeamOnboardingStep;
}

function parseStep(value: string | null): TeamOnboardingStep {
  if (value && TEAM_ONBOARDING_STEPS.includes(value as TeamOnboardingStep)) {
    return value as TeamOnboardingStep;
  }
  return 'welcome';
}

export async function loadTeamOnboardingState(): Promise<TeamOnboardingState> {
  const [completedRaw, stepRaw] = await Promise.all([
    getSetting(TEAM_ONBOARDING_KEYS.completed),
    getSetting(TEAM_ONBOARDING_KEYS.step),
  ]);

  return {
    completed: completedRaw === 'true',
    step: parseStep(stepRaw),
  };
}

export async function saveTeamOnboardingStep(step: TeamOnboardingStep): Promise<void> {
  await setSetting(TEAM_ONBOARDING_KEYS.step, step);
}

export async function markTeamOnboardingCompleted(): Promise<void> {
  await setSetting(TEAM_ONBOARDING_KEYS.completed, 'true');
  await setSetting(TEAM_ONBOARDING_KEYS.step, 'api-plugins');
}

export async function resetTeamOnboarding(): Promise<void> {
  await setSetting(TEAM_ONBOARDING_KEYS.completed, 'false');
  await setSetting(TEAM_ONBOARDING_KEYS.step, 'welcome');
}

export function getWebHelpUrl(slug: string): string {
  const base = import.meta.env.VITE_WEB_PUBLIC_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/help/${slug}`;
}

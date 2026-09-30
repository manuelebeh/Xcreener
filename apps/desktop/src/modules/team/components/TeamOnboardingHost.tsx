import { useCallback, useEffect, useState } from 'react';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { loadTeamOnboardingState, type TeamOnboardingStep } from '../onboarding';
import { useTeamStore } from '../store';
import { TeamOnboardingWizard } from './TeamOnboardingWizard';

export function TeamOnboardingHost() {
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState<TeamOnboardingStep>('welcome');
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const workspaces = useTeamStore((s) => s.workspaces);
  const activeWorkspaceId = useTeamStore((s) => s.activeWorkspaceId);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const shouldPrompt =
    isCloudConfigured() &&
    isAuthenticated &&
    (workspaces.length === 0 || activeWorkspace?.role === 'admin');

  const evaluate = useCallback(async () => {
    if (!shouldPrompt) {
      return;
    }
    const state = await loadTeamOnboardingState();
    if (!state.completed) {
      setInitialStep(state.step);
      setOpen(true);
    }
  }, [shouldPrompt]);

  useEffect(() => {
    void evaluate();
  }, [evaluate]);

  return (
    <TeamOnboardingWizard
      open={open}
      initialStep={initialStep}
      onClose={() => setOpen(false)}
      onCompleted={() => setOpen(false)}
    />
  );
}

import { openUrl } from '@tauri-apps/plugin-opener';
import { isPaidPlan } from '@xcreener/team-core';
import { Button, Input } from '@xcreener/ui';
import { useCallback, useEffect, useState } from 'react';
import {
  captureExperimentExposure,
  captureOnboardingStepCompleted,
  getOnboardingExperimentVariant,
} from '@/integrations/posthog/experiments';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import {
  getNextOnboardingStep,
  getWebHelpUrl,
  markTeamOnboardingCompleted,
  saveTeamOnboardingStep,
  TEAM_ONBOARDING_STEPS,
  type TeamOnboardingStep,
} from '../onboarding';
import { useTeamStore } from '../store';
import { BillingSection } from './BillingSection';
import { BrandKitSection } from './BrandKitSection';
import { InviteMemberDialog } from './InviteMemberDialog';

interface TeamOnboardingWizardProps {
  open: boolean;
  initialStep?: TeamOnboardingStep;
  onClose: () => void;
  onCompleted: () => void;
}

function stepIndex(step: TeamOnboardingStep): number {
  return TEAM_ONBOARDING_STEPS.indexOf(step);
}

export function TeamOnboardingWizard({
  open,
  initialStep = 'welcome',
  onClose,
  onCompleted,
}: TeamOnboardingWizardProps) {
  const [step, setStep] = useState<TeamOnboardingStep>(initialStep);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const signIn = useCloudAuthStore((s) => s.signIn);
  const isCloudLoading = useCloudAuthStore((s) => s.isLoading);
  const workspaces = useTeamStore((s) => s.workspaces);
  const activeWorkspaceId = useTeamStore((s) => s.activeWorkspaceId);
  const createTeamWorkspace = useTeamStore((s) => s.createTeamWorkspace);
  const hydrate = useTeamStore((s) => s.hydrate);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const isAdmin = activeWorkspace?.role === 'admin';

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setError(null);
      const variant = getOnboardingExperimentVariant();
      captureExperimentExposure('team-onboarding-v1', variant);
    }
  }, [open, initialStep]);

  const goTo = useCallback(async (next: TeamOnboardingStep) => {
    setStep(next);
    setError(null);
    captureOnboardingStepCompleted(next);
    await saveTeamOnboardingStep(next);
  }, []);

  const finish = useCallback(async () => {
    await markTeamOnboardingCompleted();
    onCompleted();
    onClose();
  }, [onClose, onCompleted]);

  async function handleCreateWorkspace() {
    const name = workspaceName.trim();
    if (!name) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createTeamWorkspace(name);
      await goTo('plan');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setCreating(false);
    }
  }

  if (!open || !isCloudConfigured()) {
    return null;
  }

  const currentIndex = stepIndex(step);
  const progress = Math.round(((currentIndex + 1) / TEAM_ONBOARDING_STEPS.length) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-onboarding-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
        <header className="border-b border-border px-5 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="m-0 text-xs font-medium text-muted">
              Step {currentIndex + 1} of {TEAM_ONBOARDING_STEPS.length}
            </p>
            <button
              type="button"
              className="sg-focus-ring text-xs text-muted hover:text-foreground"
              onClick={() => void finish()}
            >
              Skip setup
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'welcome' ? (
            <div className="space-y-3">
              <h2 id="team-onboarding-title" className="font-display text-lg font-semibold">
                Set up your team workspace
              </h2>
              <p className="text-sm text-muted">
                Share a brand kit, invite colleagues, and unlock collaboration, API access, and
                plugins — all from one workspace.
              </p>
            </div>
          ) : null}

          {step === 'cloud-auth' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Sign in to Xcreener cloud</h2>
              <p className="text-sm text-muted">
                Team features require cloud auth. Your captures stay local until you choose to
                upload.
              </p>
              {isAuthenticated ? (
                <p className="text-sm text-success">You are signed in.</p>
              ) : (
                <Button type="button" disabled={isCloudLoading} onClick={() => signIn()}>
                  {isCloudLoading ? 'Waiting for browser…' : 'Sign in with Auth0'}
                </Button>
              )}
            </div>
          ) : null}

          {step === 'create-workspace' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Create your workspace</h2>
              <p className="text-sm text-muted">Choose a name your team will recognize.</p>
              {activeWorkspace && isAdmin ? (
                <p className="text-sm text-muted">
                  Using workspace <strong>{activeWorkspace.name}</strong>.
                </p>
              ) : (
                <>
                  <label htmlFor="onboarding-workspace-name" className="block text-sm font-medium">
                    Workspace name
                    <Input
                      id="onboarding-workspace-name"
                      value={workspaceName}
                      onChange={(event) => setWorkspaceName(event.target.value)}
                      className="mt-2"
                      placeholder="Acme Design"
                    />
                  </label>
                  <Button
                    type="button"
                    disabled={creating || !workspaceName.trim()}
                    onClick={() => void handleCreateWorkspace()}
                  >
                    {creating ? 'Creating…' : 'Create workspace'}
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {step === 'plan' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Choose a plan</h2>
              <p className="text-sm text-muted">
                Start free or upgrade for brand kit, collaboration, and Team Pro API access.
              </p>
              {activeWorkspace && isPaidPlan(activeWorkspace.plan) ? (
                <p className="text-sm text-success">Plan: {activeWorkspace.plan}</p>
              ) : (
                <BillingSection />
              )}
            </div>
          ) : null}

          {step === 'brand-kit' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Brand kit</h2>
              <p className="text-sm text-muted">
                Set logo, colors, and watermark for consistent team exports.
              </p>
              <BrandKitSection />
            </div>
          ) : null}

          {step === 'invite' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Invite your team</h2>
              <p className="text-sm text-muted">Send an invite link to your first teammate.</p>
              {isAdmin ? <InviteMemberDialog /> : null}
            </div>
          ) : null}

          {step === 'api-plugins' ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">API & plugins</h2>
              <p className="text-sm text-muted">
                Team Pro includes API keys for VS Code, Figma, and Notion embeds. Create keys in
                Settings → Team after setup.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void openUrl(getWebHelpUrl('api-api-keys-and-sdk'))}
                >
                  API keys guide
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void openUrl(getWebHelpUrl('plugins-vscode-extension'))}
                >
                  VS Code plugin
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => {
              const previous = TEAM_ONBOARDING_STEPS[currentIndex - 1];
              if (previous) {
                void goTo(previous);
              }
            }}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {step === 'api-plugins' ? (
              <Button type="button" size="sm" onClick={() => void finish()}>
                Finish
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void (async () => {
                    if (step === 'welcome') {
                      await goTo(isAuthenticated ? 'create-workspace' : 'cloud-auth');
                      return;
                    }
                    if (step === 'cloud-auth') {
                      if (!isAuthenticated) {
                        setError('Sign in to continue');
                        return;
                      }
                      await goTo('create-workspace');
                      return;
                    }
                    if (step === 'create-workspace') {
                      if (!activeWorkspace) {
                        setError('Create a workspace to continue');
                        return;
                      }
                      await hydrate();
                      await goTo('plan');
                      return;
                    }
                    const skipBrandKit = getOnboardingExperimentVariant() === 'skip_brand_kit';
                    const next = getNextOnboardingStep(step, { skipBrandKit });
                    if (next) {
                      await goTo(next);
                    }
                  })();
                }}
              >
                Continue
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

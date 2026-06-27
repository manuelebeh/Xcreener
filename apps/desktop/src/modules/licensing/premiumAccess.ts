import { isPaidPlan } from '@snapglow/team-core';
import { useSettingsStore } from '@/modules/settings/store';
import { useTeamStore } from '@/modules/team/store';
import { isExternalLicense } from '@/modules/licensing/detectLicenseSource';

export function hasPremiumAccess(): boolean {
  const { licenseSource } = useSettingsStore.getState();
  if (isExternalLicense(licenseSource)) {
    return true;
  }

  const { workspaces } = useTeamStore.getState();
  return workspaces.some((workspace) => isPaidPlan(workspace.plan));
}

export function hasEnterpriseIntegrationsAccess(): boolean {
  const { activeWorkspaceId, workspaces } = useTeamStore.getState();
  const workspace =
    workspaces.find((item) => item.id === activeWorkspaceId) ??
    workspaces.find((item) => item.plan === 'team_pro');
  return workspace?.plan === 'team_pro';
}

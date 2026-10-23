import { useTeamStore } from '@/modules/team/store';
import { detectLicenseSource, isExternalLicense } from './detectLicenseSource';
import { hasPaidEntitlement, isPaidEntitlement, useEntitlementStore } from './entitlement';

/**
 * Paid plan, from sources the user cannot edit: the build's distribution channel, or an
 * API-signed entitlement verified in Rust. Never from SQLite settings or the team list.
 */
export function hasPremiumAccess(): boolean {
  return isExternalLicense(detectLicenseSource()) || hasPaidEntitlement();
}

/** Same as hasPremiumAccess, re-rendering when the verified plan changes. */
export function usePremiumAccess(): boolean {
  const entitlement = useEntitlementStore((s) => s.entitlement);
  return isExternalLicense(detectLicenseSource()) || isPaidEntitlement(entitlement);
}

export function hasEnterpriseIntegrationsAccess(): boolean {
  const { activeWorkspaceId, workspaces } = useTeamStore.getState();
  const workspace =
    workspaces.find((item) => item.id === activeWorkspaceId) ??
    workspaces.find((item) => item.plan === 'team_pro');
  return workspace?.plan === 'team_pro';
}

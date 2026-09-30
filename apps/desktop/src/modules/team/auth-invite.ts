import { openUrl } from '@tauri-apps/plugin-opener';
import { getValidAccessToken, startAuthLoginWithOrganization } from '@/modules/cloud/auth';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { createBillingPortalSession } from './api';
import { useTeamStore } from './store';

export function parseTeamInviteUrl(url: string): string | null {
  const parsed = new URL(url);
  if (parsed.protocol !== 'snapglow:' || !parsed.pathname.includes('team/invite')) {
    return null;
  }
  return parsed.searchParams.get('token');
}

let pendingInviteToken: string | null = null;

export async function handleTeamInviteUrl(url: string): Promise<boolean> {
  const token = parseTeamInviteUrl(url);
  if (!token) {
    return false;
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    if (isCloudConfigured()) {
      await startAuthLoginWithOrganization(null);
      useCloudAuthStore.setState({ isLoading: true, error: null });
    }
    pendingInviteToken = token;
    return true;
  }

  await useTeamStore.getState().acceptInviteToken(token);
  return true;
}

export async function flushPendingTeamInvite(): Promise<void> {
  if (!pendingInviteToken) {
    return;
  }
  const token = pendingInviteToken;
  pendingInviteToken = null;
  await useTeamStore.getState().acceptInviteToken(token);
}

export async function openBillingPortal(workspaceId: string): Promise<void> {
  const session = await createBillingPortalSession(workspaceId);
  await openUrl(session.url);
}

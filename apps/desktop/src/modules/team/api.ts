import type {
  BillingStatusResponse,
  BrandKitConfig,
  CheckoutSessionResponse,
  InvitationResponse,
  MemberResponse,
  SsoStatusResponse,
  WorkspacePlan,
  WorkspaceResponse,
  WorkspaceRole,
  WorkspaceUsageResponse,
} from '@xcreener/team-core';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { getApiUrl } from '@/modules/cloud/config';
import { getWorkspaceHeaders } from './headers';

export async function teamFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to Xcreener cloud to manage teams');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  const workspaceHeaders = getWorkspaceHeaders();
  for (const [key, value] of Object.entries(workspaceHeaders)) {
    headers.set(key, value);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listWorkspaces(): Promise<WorkspaceResponse[]> {
  const payload = await teamFetch<{ workspaces: WorkspaceResponse[] }>('/v1/workspaces');
  return payload.workspaces;
}

export async function createWorkspace(name: string): Promise<WorkspaceResponse> {
  return teamFetch<WorkspaceResponse>('/v1/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateWorkspace(id: string, name: string): Promise<WorkspaceResponse> {
  return teamFetch<WorkspaceResponse>(`/v1/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function listMembers(workspaceId: string): Promise<MemberResponse[]> {
  const payload = await teamFetch<{ members: MemberResponse[] }>(
    `/v1/workspaces/${workspaceId}/members`
  );
  return payload.members;
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<MemberResponse> {
  return teamFetch<MemberResponse>(`/v1/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await teamFetch<void>(`/v1/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function createInvitation(
  workspaceId: string,
  input: { email?: string; role: WorkspaceRole }
): Promise<InvitationResponse> {
  return teamFetch<InvitationResponse>(`/v1/workspaces/${workspaceId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await teamFetch<void>(`/v1/workspaces/${workspaceId}/invitations/${invitationId}`, {
    method: 'DELETE',
  });
}

export async function acceptInvitation(token: string): Promise<WorkspaceResponse> {
  return teamFetch<WorkspaceResponse>(`/v1/invitations/${token}/accept`, {
    method: 'POST',
  });
}

export async function getBillingStatus(workspaceId: string): Promise<BillingStatusResponse> {
  return teamFetch<BillingStatusResponse>(`/v1/workspaces/${workspaceId}/billing`);
}

export async function createCheckoutSession(
  workspaceId: string,
  plan: Extract<WorkspacePlan, 'team_starter' | 'team_pro'>
): Promise<CheckoutSessionResponse> {
  return teamFetch<CheckoutSessionResponse>(`/v1/workspaces/${workspaceId}/billing/checkout`, {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function createBillingPortalSession(
  workspaceId: string
): Promise<CheckoutSessionResponse> {
  return teamFetch<CheckoutSessionResponse>(`/v1/workspaces/${workspaceId}/billing/portal`, {
    method: 'POST',
  });
}

export async function getBrandKit(workspaceId: string): Promise<BrandKitConfig> {
  return teamFetch<BrandKitConfig>(`/v1/workspaces/${workspaceId}/brand-kit`);
}

export async function updateBrandKit(
  workspaceId: string,
  config: Pick<BrandKitConfig, 'colors' | 'fonts' | 'watermark'>
): Promise<BrandKitConfig> {
  return teamFetch<BrandKitConfig>(`/v1/workspaces/${workspaceId}/brand-kit`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function uploadBrandKitLogo(workspaceId: string, file: File): Promise<BrandKitConfig> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to Xcreener cloud to manage brand kit');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getApiUrl()}/v1/workspaces/${workspaceId}/brand-kit/logo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Upload failed (${response.status})`);
  }

  return (await response.json()) as BrandKitConfig;
}

export async function getSsoStatus(workspaceId: string): Promise<SsoStatusResponse> {
  return teamFetch<SsoStatusResponse>(`/v1/workspaces/${workspaceId}/sso`);
}

export async function enableSso(workspaceId: string): Promise<SsoStatusResponse> {
  return teamFetch<SsoStatusResponse>(`/v1/workspaces/${workspaceId}/sso/enable`, {
    method: 'POST',
  });
}

export async function getWorkspaceUsage(
  workspaceId: string,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<WorkspaceUsageResponse> {
  return teamFetch<WorkspaceUsageResponse>(`/v1/workspaces/${workspaceId}/usage?period=${period}`);
}

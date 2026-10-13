import type { CreateShareResponse, ShareExpiry } from '@snapglow/cloud-core';
import { getWorkspaceHeaders } from '@/modules/team/headers';
import { getValidAccessToken } from './auth';
import { getApiUrl } from './config';

export async function uploadShare(
  blob: Blob,
  expiresIn: ShareExpiry,
  filename: string
): Promise<CreateShareResponse> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to SnapGlow cloud before sharing');
  }

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('expiresIn', expiresIn);

  const response = await fetch(`${getApiUrl()}/v1/shares`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...getWorkspaceHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Upload failed (${response.status})`);
  }

  return (await response.json()) as CreateShareResponse;
}

/** Deletes a share you created so its link stops working immediately. */
export async function revokeShare(token: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to SnapGlow cloud before revoking a link');
  }

  const response = await fetch(`${getApiUrl()}/v1/shares/${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}`, ...getWorkspaceHeaders() },
  });

  if (!response.ok && response.status !== 404) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Revoke failed (${response.status})`);
  }
}

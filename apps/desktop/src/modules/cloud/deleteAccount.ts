import { getValidAccessToken } from './auth';
import { getApiUrl } from './config';

/**
 * Erases the cloud account and its data on the API. Local captures stay on this device.
 * Throws with the blocking workspace names when the user is the only admin of a team.
 */
export async function deleteCloudAccount(): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sign in to SnapGlow cloud first');
  }

  const response = await fetch(`${getApiUrl()}/v1/users/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.ok) {
    return;
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    workspaces?: { name: string }[];
  } | null;
  if (response.status === 409 && payload?.workspaces?.length) {
    const names = payload.workspaces.map((workspace) => workspace.name).join(', ');
    throw new Error(`Make another member an admin of ${names} before deleting your account.`);
  }
  throw new Error(payload?.error ?? `Account deletion failed (${response.status})`);
}

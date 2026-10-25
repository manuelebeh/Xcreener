import type { ApiKeyResponse, CreateApiKeyResponse } from '@xcreener/api-core';
import { teamFetch } from './api';

export async function listApiKeys(workspaceId: string): Promise<ApiKeyResponse[]> {
  const payload = await teamFetch<{ items: ApiKeyResponse[] }>(
    `/v1/workspaces/${workspaceId}/api-keys`
  );
  return payload.items;
}

export async function createApiKey(
  workspaceId: string,
  name: string
): Promise<CreateApiKeyResponse> {
  return teamFetch<CreateApiKeyResponse>(`/v1/workspaces/${workspaceId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
  await teamFetch<void>(`/v1/workspaces/${workspaceId}/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}

export type { ApiKeyResponse, CreateApiKeyResponse };

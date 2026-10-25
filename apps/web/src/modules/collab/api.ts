import type {
  CollabDocumentResponse,
  CommentResponse,
  NotificationResponse,
} from '@xcreener/collab-core';
import { getValidAccessToken } from './auth';

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
}

async function authHeaders(workspaceId?: string): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sign in required');
  }
  return {
    Authorization: `Bearer ${token}`,
    ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
  };
}

export async function fetchCollabDocument(documentId: string): Promise<CollabDocumentResponse> {
  const response = await fetch(
    `${getApiUrl()}/v1/collab/documents/${encodeURIComponent(documentId)}`,
    {
      headers: await authHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to load collaboration document');
  }
  return (await response.json()) as CollabDocumentResponse;
}

export async function fetchComments(documentId: string): Promise<CommentResponse[]> {
  const response = await fetch(
    `${getApiUrl()}/v1/collab/documents/${encodeURIComponent(documentId)}/comments`,
    {
      headers: await authHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to load comments');
  }
  const payload = (await response.json()) as { comments: CommentResponse[] };
  return payload.comments;
}

export async function createComment(
  documentId: string,
  workspaceId: string,
  body: { body: string; anchor?: { x: number; y: number } | null }
): Promise<CommentResponse> {
  const response = await fetch(
    `${getApiUrl()}/v1/collab/documents/${encodeURIComponent(documentId)}/comments`,
    {
      method: 'POST',
      headers: {
        ...(await authHeaders(workspaceId)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to create comment');
  }
  return (await response.json()) as CommentResponse;
}

export async function fetchNotifications(): Promise<NotificationResponse[]> {
  const response = await fetch(`${getApiUrl()}/v1/notifications`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to load notifications');
  }
  const payload = (await response.json()) as { notifications: NotificationResponse[] };
  return payload.notifications;
}

export function getCollabWsUrl(): string {
  const api = new URL(getApiUrl());
  api.protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  api.pathname = '/v1/collab/ws';
  api.search = '';
  return api.toString();
}

export function getApiBaseUrl(): string {
  return getApiUrl();
}

import type {
  CollabDocumentResponse,
  CollabDocumentState,
  CommentResponse,
  CreateCollabDocumentResponse,
  NotificationResponse,
} from '@snapglow/collab-core';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { getApiUrl } from '@/modules/cloud/config';
import { getWorkspaceHeaders } from '@/modules/team/headers';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Sign in required');
  }
  return {
    Authorization: `Bearer ${token}`,
    ...getWorkspaceHeaders(),
  };
}

export async function createCollabDocument(options: {
  screenshotBlob: Blob;
  documentState: CollabDocumentState;
  title?: string;
}): Promise<CreateCollabDocumentResponse> {
  const form = new FormData();
  form.append('file', options.screenshotBlob, 'screenshot.png');
  form.append('documentState', JSON.stringify(options.documentState));
  form.append('screenshotWidth', String(options.documentState.screenshotWidth));
  form.append('screenshotHeight', String(options.documentState.screenshotHeight));
  if (options.title) {
    form.append('title', options.title);
  }

  const response = await fetch(`${getApiUrl()}/v1/collab/documents`, {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? 'Failed to create collaboration session');
  }

  return (await response.json()) as CreateCollabDocumentResponse;
}

export async function fetchCollabDocument(documentId: string): Promise<CollabDocumentResponse> {
  const response = await fetch(`${getApiUrl()}/v1/collab/documents/${documentId}`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to load collaboration document');
  }

  return (await response.json()) as CollabDocumentResponse;
}

export async function patchCollabDocument(
  documentId: string,
  payload: { documentState?: CollabDocumentState; title?: string }
): Promise<CollabDocumentResponse> {
  const response = await fetch(`${getApiUrl()}/v1/collab/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update collaboration document');
  }

  return (await response.json()) as CollabDocumentResponse;
}

export async function fetchComments(documentId: string): Promise<CommentResponse[]> {
  const response = await fetch(`${getApiUrl()}/v1/collab/documents/${documentId}/comments`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to load comments');
  }
  const payload = (await response.json()) as { comments: CommentResponse[] };
  return payload.comments;
}

export async function createComment(
  documentId: string,
  body: { body: string; parentId?: string | null; anchor?: { x: number; y: number } | null }
): Promise<CommentResponse> {
  const response = await fetch(`${getApiUrl()}/v1/collab/documents/${documentId}/comments`, {
    method: 'POST',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
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

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetch(`${getApiUrl()}/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: await authHeaders(),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${getApiUrl()}/v1/notifications/read-all`, {
    method: 'POST',
    headers: await authHeaders(),
  });
}

export function getCollabWsUrl(): string {
  const api = new URL(getApiUrl());
  api.protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  api.pathname = '/v1/collab/ws';
  api.search = '';
  return api.toString();
}

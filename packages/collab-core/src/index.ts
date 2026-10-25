import type {
  Annotation,
  BackgroundConfig,
  FramePreset,
  ScreenshotTransform,
  ShadowConfig,
} from '@xcreener/editor-core';

export const COLLAB_WS_PATH = '/v1/collab/ws';
export const COLLAB_PRESENCE_TTL_SECONDS = 30;
export const COLLAB_PRESENCE_THROTTLE_MS = 50;
export const COLLAB_TARGET_SYNC_MS = 200;

export type NotificationType = 'comment' | 'mention' | 'invitation';

export interface CommentAnchor {
  x: number;
  y: number;
}

export interface CollabDocumentState {
  screenshotWidth: number;
  screenshotHeight: number;
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
  frame: FramePreset | null;
  transform: ScreenshotTransform;
  annotations: Annotation[];
}

export interface CollabDocumentResponse {
  id: string;
  workspaceId: string;
  libraryItemId: string | null;
  title: string | null;
  createdBy: string;
  documentState: CollabDocumentState;
  version: number;
  screenshotUrl: string;
  collabUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollabDocumentResponse {
  id: string;
  collabUrl: string;
  createdAt: string;
}

export interface CommentResponse {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string | null;
  parentId: string | null;
  body: string;
  anchor: CommentAnchor | null;
  mentionUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export type AnnotationOpType = 'add' | 'update' | 'remove' | 'batch';

export interface AnnotationOp {
  op: AnnotationOpType;
  annotation?: Annotation;
  annotationId?: string;
  patch?: Partial<Annotation>;
  annotations?: Annotation[];
  clientVersion?: number;
}

export interface ParticipantPresence {
  userId: string;
  email: string | null;
  displayName: string | null;
  color: string;
  cursorX: number | null;
  cursorY: number | null;
  selectedAnnotationId: string | null;
}

export type CollabClientMessage =
  | { type: 'auth'; token: string; documentId: string }
  | { type: 'ping' }
  | { type: 'annotation:op'; op: AnnotationOp }
  | {
      type: 'presence:update';
      presence: Omit<ParticipantPresence, 'userId' | 'email' | 'displayName'>;
    };

export type CollabServerMessage =
  | {
      type: 'auth:ok';
      userId: string;
      role: string;
      version: number;
      participants: ParticipantPresence[];
    }
  | { type: 'auth:error'; error: string }
  | { type: 'pong' }
  | { type: 'annotation:op'; op: AnnotationOp; userId: string; version: number }
  | { type: 'presence:update'; presence: ParticipantPresence }
  | { type: 'participant:left'; userId: string }
  | { type: 'comment:created'; comment: CommentResponse }
  | { type: 'comment:updated'; comment: CommentResponse }
  | { type: 'comment:deleted'; commentId: string }
  | { type: 'notification:created'; notification: NotificationResponse }
  | { type: 'error'; error: string };

export const PARTICIPANT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
] as const;

export function participantColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % PARTICIPANT_COLORS.length;
  }
  return PARTICIPANT_COLORS[hash] ?? PARTICIPANT_COLORS[0];
}

export function parseMentionEmails(body: string): string[] {
  const matches = body.match(/@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
  if (!matches) {
    return [];
  }
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export function isCollabClientMessage(value: unknown): value is CollabClientMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false;
  }
  const type = (value as { type: string }).type;
  return (
    type === 'auth' || type === 'ping' || type === 'annotation:op' || type === 'presence:update'
  );
}

export function defaultCollabDocumentState(
  screenshotWidth: number,
  screenshotHeight: number
): CollabDocumentState {
  return {
    screenshotWidth,
    screenshotHeight,
    background: { type: 'gradient', presetId: 'xcreener-brand' },
    padding: 40,
    borderRadius: 12,
    shadow: {
      opacity: 0.35,
      blur: 24,
      offsetX: 0,
      offsetY: 8,
      color: '#000000',
    },
    frame: null,
    transform: { scale: 1, offsetX: 0, offsetY: 0 },
    annotations: [],
  };
}

export function buildCollabUrl(webPublicUrl: string, documentId: string): string {
  const base = webPublicUrl.replace(/\/$/, '');
  return `${base}/c/${documentId}`;
}

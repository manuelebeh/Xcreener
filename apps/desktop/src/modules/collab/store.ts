import type {
  CollabDocumentResponse,
  CommentResponse,
  NotificationResponse,
  ParticipantPresence,
} from '@snapglow/collab-core';
import { create } from 'zustand';

interface CollabState {
  documentId: string | null;
  document: CollabDocumentResponse | null;
  connected: boolean;
  reconnecting: boolean;
  readOnly: boolean;
  participants: ParticipantPresence[];
  remoteCursors: ParticipantPresence[];
  comments: CommentResponse[];
  notifications: NotificationResponse[];
  commentMode: boolean;
  pendingAnchor: { x: number; y: number } | null;
  statusMessage: string | null;
  setDocument: (document: CollabDocumentResponse | null) => void;
  setDocumentId: (documentId: string | null) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setReadOnly: (readOnly: boolean) => void;
  setParticipants: (participants: ParticipantPresence[]) => void;
  upsertParticipant: (participant: ParticipantPresence) => void;
  removeParticipant: (userId: string) => void;
  setComments: (comments: CommentResponse[]) => void;
  addComment: (comment: CommentResponse) => void;
  updateComment: (comment: CommentResponse) => void;
  removeComment: (commentId: string) => void;
  setNotifications: (notifications: NotificationResponse[]) => void;
  addNotification: (notification: NotificationResponse) => void;
  markNotificationRead: (notificationId: string) => void;
  setCommentMode: (enabled: boolean) => void;
  setPendingAnchor: (anchor: { x: number; y: number } | null) => void;
  setStatusMessage: (message: string | null) => void;
  reset: () => void;
}

export const useCollabStore = create<CollabState>((set) => ({
  documentId: null,
  document: null,
  connected: false,
  reconnecting: false,
  readOnly: false,
  participants: [],
  remoteCursors: [],
  comments: [],
  notifications: [],
  commentMode: false,
  pendingAnchor: null,
  statusMessage: null,
  setDocument: (document) => set({ document }),
  setDocumentId: (documentId) => set({ documentId }),
  setConnected: (connected) => set({ connected, ...(connected ? { reconnecting: false } : {}) }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setReadOnly: (readOnly) => set({ readOnly }),
  setParticipants: (participants) => set({ participants, remoteCursors: participants }),
  upsertParticipant: (participant) =>
    set((state) => {
      const next = state.participants.filter((item) => item.userId !== participant.userId);
      next.push(participant);
      return { participants: next, remoteCursors: next };
    }),
  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((item) => item.userId !== userId),
      remoteCursors: state.remoteCursors.filter((item) => item.userId !== userId),
    })),
  setComments: (comments) => set({ comments }),
  addComment: (comment) => set((state) => ({ comments: [comment, ...state.comments] })),
  updateComment: (comment) =>
    set((state) => ({
      comments: state.comments.map((item) => (item.id === comment.id ? comment : item)),
    })),
  removeComment: (commentId) =>
    set((state) => ({
      comments: state.comments.filter((item) => item.id !== commentId),
    })),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  markNotificationRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
      ),
    })),
  setCommentMode: (commentMode) => set({ commentMode }),
  setPendingAnchor: (pendingAnchor) => set({ pendingAnchor }),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  reset: () =>
    set({
      documentId: null,
      document: null,
      connected: false,
      reconnecting: false,
      readOnly: false,
      participants: [],
      remoteCursors: [],
      comments: [],
      commentMode: false,
      pendingAnchor: null,
      statusMessage: null,
    }),
}));

export function unreadNotificationCount(): number {
  return useCollabStore.getState().notifications.filter((item) => !item.readAt).length;
}

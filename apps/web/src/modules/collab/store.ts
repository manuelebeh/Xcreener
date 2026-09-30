import type {
  CollabDocumentResponse,
  CommentResponse,
  NotificationResponse,
  ParticipantPresence,
} from '@snapglow/collab-core';
import type { Annotation } from '@snapglow/editor-core';
import { create } from 'zustand';

interface CollabState {
  document: CollabDocumentResponse | null;
  connected: boolean;
  readOnly: boolean;
  annotations: Annotation[];
  participants: ParticipantPresence[];
  comments: CommentResponse[];
  notifications: NotificationResponse[];
  commentBody: string;
  pendingAnchor: { x: number; y: number } | null;
  setDocument: (document: CollabDocumentResponse | null) => void;
  setConnected: (connected: boolean) => void;
  setReadOnly: (readOnly: boolean) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setParticipants: (participants: ParticipantPresence[]) => void;
  upsertParticipant: (participant: ParticipantPresence) => void;
  removeParticipant: (userId: string) => void;
  setComments: (comments: CommentResponse[]) => void;
  addComment: (comment: CommentResponse) => void;
  setNotifications: (notifications: NotificationResponse[]) => void;
  addNotification: (notification: NotificationResponse) => void;
  setCommentBody: (commentBody: string) => void;
  setPendingAnchor: (anchor: { x: number; y: number } | null) => void;
}

export const useCollabStore = create<CollabState>((set) => ({
  document: null,
  connected: false,
  readOnly: false,
  annotations: [],
  participants: [],
  comments: [],
  notifications: [],
  commentBody: '',
  pendingAnchor: null,
  setDocument: (document) =>
    set({ document, annotations: document?.documentState.annotations ?? [] }),
  setConnected: (connected) => set({ connected }),
  setReadOnly: (readOnly) => set({ readOnly }),
  setAnnotations: (annotations) => set({ annotations }),
  setParticipants: (participants) => set({ participants }),
  upsertParticipant: (participant) =>
    set((state) => ({
      participants: [
        ...state.participants.filter((p) => p.userId !== participant.userId),
        participant,
      ],
    })),
  removeParticipant: (userId) =>
    set((state) => ({ participants: state.participants.filter((p) => p.userId !== userId) })),
  setComments: (comments) => set({ comments }),
  addComment: (comment) => set((state) => ({ comments: [comment, ...state.comments] })),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  setCommentBody: (commentBody) => set({ commentBody }),
  setPendingAnchor: (pendingAnchor) => set({ pendingAnchor }),
}));

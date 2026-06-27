import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { getValidAccessToken } from '@/modules/cloud/auth';
import { useEditorStore } from '@/modules/editor/store';
import { fetchComments, fetchCollabDocument } from '../api';
import { collabClient } from '../client';
import { useCollabStore } from '../store';
import {
  applyRemoteAnnotationOp,
  emitAnnotationOps,
  snapshotAnnotations,
} from '../syncAnnotations';

export function useCollabSession(documentId: string | null): void {
  const setConnected = useCollabStore((s) => s.setConnected);
  const setReconnecting = useCollabStore((s) => s.setReconnecting);
  const setReadOnly = useCollabStore((s) => s.setReadOnly);
  const setDocument = useCollabStore((s) => s.setDocument);
  const setParticipants = useCollabStore((s) => s.setParticipants);
  const upsertParticipant = useCollabStore((s) => s.upsertParticipant);
  const removeParticipant = useCollabStore((s) => s.removeParticipant);
  const addComment = useCollabStore((s) => s.addComment);
  const updateComment = useCollabStore((s) => s.updateComment);
  const removeComment = useCollabStore((s) => s.removeComment);
  const addNotification = useCollabStore((s) => s.addNotification);
  const setComments = useCollabStore((s) => s.setComments);
  const annotations = useEditorStore((s) => s.annotations);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const prevAnnotationsRef = useRef(snapshotAnnotations());

  useEffect(() => {
    if (!documentId) {
      collabClient.disconnect();
      useCollabStore.getState().reset();
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await getValidAccessToken();
      if (!token || cancelled) {
        return;
      }

      const document = await fetchCollabDocument(documentId);
      if (cancelled) {
        return;
      }

      setDocument(document);
      useEditorStore.getState().setAnnotations(document.documentState.annotations);
      const comments = await fetchComments(documentId);
      if (!cancelled) {
        setComments(comments);
      }

      collabClient.connect(documentId, token);
    })();

    const offConnection = collabClient.onConnectionChange((state) => {
      if (state === 'connected') {
        setConnected(true);
        setReconnecting(false);
      } else if (state === 'reconnecting') {
        setConnected(false);
        setReconnecting(true);
        useCollabStore.getState().setStatusMessage('Reconnecting to collaboration session…');
      } else {
        setConnected(false);
        useCollabStore.getState().setStatusMessage('Collaboration disconnected');
      }
    });

    const off = collabClient.onMessage((message) => {
      if (message.type === 'auth:ok') {
        setConnected(true);
        setReadOnly(message.role === 'viewer');
        setParticipants(message.participants);
        prevAnnotationsRef.current = snapshotAnnotations();
      }
      if (message.type === 'auth:error') {
        useCollabStore.getState().setStatusMessage(message.error);
      }
      if (message.type === 'annotation:op') {
        applyRemoteAnnotationOp(message.op);
        prevAnnotationsRef.current = snapshotAnnotations();
      }
      if (message.type === 'presence:update') {
        upsertParticipant(message.presence);
      }
      if (message.type === 'participant:left') {
        removeParticipant(message.userId);
      }
      if (message.type === 'comment:created') {
        addComment(message.comment);
      }
      if (message.type === 'comment:updated') {
        updateComment(message.comment);
      }
      if (message.type === 'comment:deleted') {
        removeComment(message.commentId);
      }
      if (message.type === 'notification:created') {
        addNotification(message.notification);
      }
    });

    return () => {
      cancelled = true;
      offConnection();
      off();
      collabClient.disconnect();
      useCollabStore.getState().reset();
    };
  }, [
    documentId,
    setConnected,
    setReadOnly,
    setDocument,
    setParticipants,
    upsertParticipant,
    removeParticipant,
    addComment,
    updateComment,
    removeComment,
    addNotification,
    setReconnecting,
    setComments,
  ]);

  useEffect(() => {
    if (!documentId || !useCollabStore.getState().connected) {
      return;
    }
    const prev = prevAnnotationsRef.current;
    if (JSON.stringify(prev) !== JSON.stringify(annotations)) {
      emitAnnotationOps(prev, annotations);
      prevAnnotationsRef.current = snapshotAnnotations();
    }
  }, [annotations, documentId]);

  useEffect(() => {
    if (!documentId || !useCollabStore.getState().connected) {
      return;
    }
    collabClient.updatePresence({
      color: '#6366f1',
      cursorX: null,
      cursorY: null,
      selectedAnnotationId,
    });
  }, [selectedAnnotationId, documentId]);
}

export function useCollabPointerPresence(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  layoutWidth: number,
  layoutHeight: number,
  displayScale: number
): void {
  const documentId = useCollabStore((s) => s.documentId);
  const connected = useCollabStore((s) => s.connected);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !documentId || !connected || layoutWidth <= 0 || layoutHeight <= 0) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / displayScale;
      const y = (event.clientY - rect.top) / displayScale;
      if (x < 0 || y < 0 || x > layoutWidth || y > layoutHeight) {
        return;
      }
      collabClient.updatePresence({
        color: '#6366f1',
        cursorX: x / layoutWidth,
        cursorY: y / layoutHeight,
        selectedAnnotationId: useEditorStore.getState().selectedAnnotationId,
      });
    };

    canvas.addEventListener('pointermove', onMove);
    return () => canvas.removeEventListener('pointermove', onMove);
  }, [canvasRef, connected, displayScale, documentId, layoutHeight, layoutWidth]);
}

import { participantColor } from '@xcreener/collab-core';
import {
  type Annotation,
  computeLayout,
  createAnnotationFromDrag,
  DEFAULT_TOOL_DEFAULTS,
  type EditorTool,
} from '@xcreener/editor-core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createComment, fetchCollabDocument, fetchComments, fetchNotifications } from './api';
import {
  getValidAccessToken,
  isWebAuthConfigured,
  startWebAuthLogin,
  trySilentWebAuthLogin,
} from './auth';
import { collabClient } from './client';
import { drawAnnotations } from './drawAnnotations';
import { useCollabStore } from './store';
import { applyRemoteAnnotationOp, emitAnnotationOps } from './syncAnnotations';

const TOOLS: EditorTool[] = ['select', 'rect', 'arrow', 'text', 'highlight'];

export function CollabEditor({ documentId }: { documentId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; tool: EditorTool } | null>(null);
  const prevAnnotationsRef = useRef<Annotation[]>([]);

  const document = useCollabStore((s) => s.document);
  const connected = useCollabStore((s) => s.connected);
  const readOnly = useCollabStore((s) => s.readOnly);
  const annotations = useCollabStore((s) => s.annotations);
  const participants = useCollabStore((s) => s.participants);
  const comments = useCollabStore((s) => s.comments);
  const notifications = useCollabStore((s) => s.notifications);
  const commentBody = useCollabStore((s) => s.commentBody);
  const pendingAnchor = useCollabStore((s) => s.pendingAnchor);

  const [activeTool, setActiveTool] = useState<EditorTool>('rect');
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (isWebAuthConfigured() && trySilentWebAuthLogin(window.location.pathname)) {
            return;
          }
          setAuthRequired(true);
          setLoading(false);
          return;
        }
        const doc = await fetchCollabDocument(documentId);
        if (cancelled) {
          return;
        }
        useCollabStore.getState().setDocument(doc);
        useCollabStore.getState().setAnnotations(doc.documentState.annotations);
        prevAnnotationsRef.current = doc.documentState.annotations;
        const loadedComments = await fetchComments(documentId);
        const loadedNotifications = await fetchNotifications();
        if (!cancelled) {
          useCollabStore.getState().setComments(loadedComments);
          useCollabStore.getState().setNotifications(loadedNotifications);
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = doc.screenshotUrl;
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Failed to load screenshot'));
        });
        if (cancelled) {
          return;
        }
        imageRef.current = image;
        collabClient.connect(documentId, getValidAccessToken);
        setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load document');
          setLoading(false);
        }
      }
    })();

    const off = collabClient.onMessage((message) => {
      if (message.type === 'auth:ok') {
        useCollabStore.getState().setConnected(true);
        useCollabStore.getState().setReadOnly(message.role === 'viewer');
        useCollabStore.getState().setParticipants(message.participants);
      }
      if (message.type === 'annotation:op') {
        applyRemoteAnnotationOp(message.op);
        prevAnnotationsRef.current = useCollabStore.getState().annotations;
      }
      if (message.type === 'presence:update') {
        useCollabStore.getState().upsertParticipant(message.presence);
      }
      if (message.type === 'participant:left') {
        useCollabStore.getState().removeParticipant(message.userId);
      }
      if (message.type === 'comment:created') {
        useCollabStore.getState().addComment(message.comment);
      }
      if (message.type === 'notification:created') {
        useCollabStore.getState().addNotification(message.notification);
      }
    });

    return () => {
      cancelled = true;
      off();
      collabClient.disconnect();
    };
  }, [documentId]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    const prev = prevAnnotationsRef.current;
    if (JSON.stringify(prev) !== JSON.stringify(annotations)) {
      emitAnnotationOps(prev, annotations);
      prevAnnotationsRef.current = annotations;
    }
  }, [annotations, connected]);

  const layoutInput = useMemo(() => {
    if (!document || !imageRef.current) {
      return null;
    }
    return {
      screenshot: imageRef.current,
      background: document.documentState.background,
      padding: document.documentState.padding,
      borderRadius: document.documentState.borderRadius,
      shadow: document.documentState.shadow,
      frame: document.documentState.frame,
      transform: document.documentState.transform,
      annotations,
      selectedAnnotationId: null,
    };
  }, [document, annotations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layoutInput) {
      return;
    }
    const layout = computeLayout(layoutInput);
    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      layout.screenshot.x,
      layout.screenshot.y,
      layout.screenshot.width,
      layout.screenshot.height,
      document?.documentState.borderRadius ?? 12
    );
    ctx.clip();
    ctx.drawImage(
      layoutInput.screenshot,
      layout.screenshot.x,
      layout.screenshot.y,
      layout.screenshot.width,
      layout.screenshot.height
    );
    ctx.restore();
    drawAnnotations(ctx, annotations);
  }, [layoutInput, annotations, document?.documentState.borderRadius]);

  if (loading) {
    return <p className="text-sm text-muted">Loading collaboration session…</p>;
  }

  if (authRequired) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-xl font-semibold">Sign in to collaborate</h1>
        <p className="text-sm text-muted">Auth0 is required to join this workspace document.</p>
        {isWebAuthConfigured() ? (
          <button
            type="button"
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
            onClick={() => void startWebAuthLogin(window.location.pathname)}
          >
            Sign in with Auth0
          </button>
        ) : (
          <p className="text-sm text-muted">Configure VITE_AUTH0_* env vars for web auth.</p>
        )}
      </div>
    );
  }

  if (error || !document) {
    return <p className="text-sm text-red-600">{error ?? 'Document unavailable'}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-3">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Xcreener collaboration</p>
            <h1 className="font-display text-2xl font-semibold">
              {document.title ?? 'Shared capture'}
            </h1>
          </div>
          <p className="text-sm text-muted">
            {connected ? `${participants.length} online` : 'Connecting…'}
          </p>
        </header>

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                className={`rounded-md border px-3 py-1 text-sm capitalize ${
                  activeTool === tool
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border'
                }`}
                onClick={() => setActiveTool(tool)}
              >
                {tool}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">View-only role — annotations are read-only.</p>
        )}

        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-3">
          <canvas
            ref={canvasRef}
            className="mx-auto block max-h-[70vh] w-full touch-none"
            onPointerDown={(event) => {
              if (readOnly || !canvasRef.current) {
                return;
              }
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = canvasRef.current.width / rect.width;
              const scaleY = canvasRef.current.height / rect.height;
              dragRef.current = {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
                tool: activeTool,
              };
            }}
            onPointerUp={(event) => {
              if (readOnly || !dragRef.current || !canvasRef.current) {
                return;
              }
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = canvasRef.current.width / rect.width;
              const scaleY = canvasRef.current.height / rect.height;
              const endX = (event.clientX - rect.left) * scaleX;
              const endY = (event.clientY - rect.top) * scaleY;
              const created = createAnnotationFromDrag(
                dragRef.current.tool,
                DEFAULT_TOOL_DEFAULTS,
                dragRef.current.x,
                dragRef.current.y,
                endX,
                endY
              );
              dragRef.current = null;
              if (created) {
                useCollabStore.getState().setAnnotations([...annotations, created]);
              }
            }}
            onClick={(event) => {
              if (!canvasRef.current) {
                return;
              }
              const rect = canvasRef.current.getBoundingClientRect();
              const x = (event.clientX - rect.left) / rect.width;
              const y = (event.clientY - rect.top) / rect.height;
              useCollabStore.getState().setPendingAnchor({ x, y });
            }}
          />
          <div className="pointer-events-none absolute inset-3">
            {participants.map((participant) => {
              if (participant.cursorX == null || participant.cursorY == null) {
                return null;
              }
              const color = participant.color || participantColor(participant.userId);
              return (
                <div
                  key={participant.userId}
                  className="absolute text-[10px] font-medium text-white"
                  style={{
                    left: `${participant.cursorX * 100}%`,
                    top: `${participant.cursorY * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: color,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  {participant.displayName ?? participant.email ?? 'Teammate'}
                </div>
              );
            })}
            {comments
              .filter((comment) => comment.anchor)
              .map((comment) => (
                <div
                  key={comment.id}
                  className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-background"
                  style={{
                    left: `${(comment.anchor?.x ?? 0) * 100}%`,
                    top: `${(comment.anchor?.y ?? 0) * 100}%`,
                  }}
                />
              ))}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-medium">Comments</h2>
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Add a comment… @email@company.com to mention"
            value={commentBody}
            onChange={(event) => useCollabStore.getState().setCommentBody(event.target.value)}
          />
          {pendingAnchor ? (
            <p className="mt-1 text-xs text-muted">
              Pin ({Math.round(pendingAnchor.x * 100)}%, {Math.round(pendingAnchor.y * 100)}%)
            </p>
          ) : null}
          <button
            type="button"
            className="mt-2 rounded-md bg-foreground px-3 py-2 text-sm text-background"
            onClick={() => {
              void createComment(documentId, document.workspaceId, {
                body: commentBody.trim(),
                anchor: pendingAnchor,
              }).then((comment) => {
                useCollabStore.getState().addComment(comment);
                useCollabStore.getState().setCommentBody('');
                useCollabStore.getState().setPendingAnchor(null);
              });
            }}
          >
            Post comment
          </button>
          <ul className="mt-3 space-y-2">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-md border border-border/70 p-2 text-sm">
                <p className="text-xs text-muted">{comment.userEmail ?? 'Teammate'}</p>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-medium">Notifications</h2>
          <ul className="space-y-2 text-sm">
            {notifications.length === 0 ? (
              <li className="text-muted">No notifications yet</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className="rounded border border-border/70 p-2 text-xs">
                  <p className="font-medium capitalize">{notification.type}</p>
                  <p className="text-muted">
                    {typeof notification.payload.body === 'string'
                      ? notification.payload.body
                      : JSON.stringify(notification.payload)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}

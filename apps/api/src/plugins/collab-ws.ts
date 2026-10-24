import websocket from '@fastify/websocket';
import {
  COLLAB_WS_PATH,
  type CollabServerMessage,
  isCollabClientMessage,
  type ParticipantPresence,
  participantColor,
} from '@snapglow/collab-core';
import { can } from '@snapglow/team-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { WebSocket } from 'ws';
import type * as schema from '../db/schema';
import { env } from '../env';
import { upsertAuthUser } from '../plugins/auth';
import { ensurePaidWorkspace, resolveDocumentAccess } from '../routes/collab';
import { applyAnnotationOpToDocument, isValidAnnotationOp } from '../services/collab-ops';
import { collabRoomHub } from '../services/collab-room';

const MAX_MESSAGE_BYTES = 256 * 1024;

const jwks = createRemoteJWKSet(new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`));

interface CollabRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

interface SocketContext {
  userId: string;
  email: string | null;
  documentId: string;
  role: string;
  /** Auth0 token expiry (ms since epoch); the socket is dropped once it passes. */
  expiresAtMs: number | null;
  /** Last time membership was confirmed against the database. */
  checkedAtMs: number;
  socket: WebSocket;
}

const MEMBERSHIP_RECHECK_MS = 15_000;

/** An unauthenticated socket is closed after this delay. */
const AUTH_TIMEOUT_MS = 10_000;

/** Each op is a `SELECT ... FOR UPDATE` transaction, so one socket gets 20 per second (burst 50). */
const OP_RATE_PER_SEC = 20;
const OP_BURST = 50;

export function createTokenBucket(ratePerSec: number, burst: number, now = Date.now) {
  let tokens = burst;
  let refilledAt = now();
  return function take(): boolean {
    const current = now();
    tokens = Math.min(burst, tokens + ((current - refilledAt) / 1000) * ratePerSec);
    refilledAt = current;
    if (tokens < 1) {
      return false;
    }
    tokens -= 1;
    return true;
  };
}

function isMembershipCheckDue(context: SocketContext): boolean {
  return Date.now() - context.checkedAtMs >= MEMBERSHIP_RECHECK_MS;
}

function send(socket: WebSocket, message: CollabServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

async function buildParticipants(documentId: string): Promise<ParticipantPresence[]> {
  const raw = await collabRoomHub.listPresence(documentId);
  const participants: ParticipantPresence[] = [];
  for (const value of Object.values(raw)) {
    try {
      participants.push(JSON.parse(value) as ParticipantPresence);
    } catch {
      // skip malformed presence
    }
  }
  return participants;
}

export async function registerCollabWebSocket(
  app: FastifyInstance,
  options: CollabRouteOptions
): Promise<void> {
  await app.register(websocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });

  app.get(COLLAB_WS_PATH, { websocket: true }, (socket, request) => {
    let context: SocketContext | null = null;
    // Set before the first await of an auth message, so two auth messages cannot both pass.
    let authenticating = false;
    let unsubscribe: (() => Promise<void>) | null = null;
    const takeOpToken = createTokenBucket(OP_RATE_PER_SEC, OP_BURST);
    const authTimer = setTimeout(() => {
      if (!context) {
        socket.close(4401, 'Authentication timeout');
      }
    }, AUTH_TIMEOUT_MS);

    const cleanup = async () => {
      if (context) {
        await collabRoomHub.removePresence(context.documentId, context.userId);
        await collabRoomHub.untrackConnection(context.userId);
        await collabRoomHub.publish(context.documentId, {
          type: 'participant:left',
          userId: context.userId,
        });
      }
      if (unsubscribe) {
        await unsubscribe();
      }
    };

    socket.on('close', () => {
      clearTimeout(authTimer);
      cleanup().catch((error) => request.log.error(error));
    });

    socket.on('message', (raw) => {
      (async () => {
        let payload: unknown;
        try {
          payload = JSON.parse(raw.toString());
        } catch {
          send(socket, { type: 'error', error: 'Invalid JSON' });
          return;
        }

        if (!isCollabClientMessage(payload)) {
          send(socket, { type: 'error', error: 'Unknown message type' });
          return;
        }

        if (payload.type === 'ping') {
          send(socket, { type: 'pong' });
          return;
        }

        if (payload.type === 'auth') {
          if (context || authenticating) {
            send(socket, { type: 'auth:error', error: 'Already authenticated' });
            return;
          }
          authenticating = true;
          try {
            const { payload: jwtPayload } = await jwtVerify(payload.token, jwks, {
              issuer: `https://${env.AUTH0_DOMAIN}/`,
              audience: env.AUTH0_AUDIENCE,
            });
            const auth0Sub = jwtPayload.sub;
            if (!auth0Sub) {
              send(socket, { type: 'auth:error', error: 'Unauthorized' });
              return;
            }

            const email =
              typeof jwtPayload.email === 'string' && jwtPayload.email_verified === true
                ? jwtPayload.email
                : null;
            const user = await upsertAuthUser(options.db, auth0Sub, email);
            const access = await resolveDocumentAccess(options.db, payload.documentId, user.id);
            if (!access) {
              send(socket, { type: 'auth:error', error: 'Document not found' });
              return;
            }

            if (!(await ensurePaidWorkspace(options.db, access.doc.workspaceId))) {
              send(socket, { type: 'auth:error', error: 'Paid plan required' });
              return;
            }

            if (await collabRoomHub.isConnectionLimited(user.id)) {
              send(socket, { type: 'auth:error', error: 'Too many connections' });
              return;
            }

            context = {
              userId: user.id,
              email: user.email,
              documentId: payload.documentId,
              role: access.role,
              expiresAtMs: typeof jwtPayload.exp === 'number' ? jwtPayload.exp * 1000 : null,
              checkedAtMs: Date.now(),
              socket,
            };

            await collabRoomHub.trackConnection(user.id);
            unsubscribe = await collabRoomHub.subscribe(payload.documentId, (message) => {
              if (
                message.type === 'presence:update' &&
                message.presence.userId === context?.userId
              ) {
                return;
              }
              send(socket, message);
            });

            const presence: ParticipantPresence = {
              userId: user.id,
              email: user.email,
              displayName: user.email,
              color: participantColor(user.id),
              cursorX: null,
              cursorY: null,
              selectedAnnotationId: null,
            };
            await collabRoomHub.setPresence(payload.documentId, user.id, presence);

            clearTimeout(authTimer);
            send(socket, {
              type: 'auth:ok',
              userId: user.id,
              role: access.role,
              version: access.doc.version,
              participants: await buildParticipants(payload.documentId),
            });
          } catch {
            send(socket, { type: 'auth:error', error: 'Unauthorized' });
          } finally {
            authenticating = false;
          }
          return;
        }

        if (!context) {
          send(socket, { type: 'error', error: 'Not authenticated' });
          return;
        }

        if (payload.type === 'annotation:op' && !takeOpToken()) {
          send(socket, { type: 'error', error: 'Rate limit exceeded' });
          return;
        }

        // Authorization can change while the socket is open: token expiry, removed member, new role.
        const recheck = payload.type === 'annotation:op' || isMembershipCheckDue(context);
        if (context.expiresAtMs !== null && Date.now() >= context.expiresAtMs) {
          send(socket, { type: 'auth:error', error: 'Token expired' });
          socket.close(4401, 'Token expired');
          return;
        }
        if (recheck) {
          const access = await resolveDocumentAccess(
            options.db,
            context.documentId,
            context.userId
          );
          if (!access) {
            send(socket, { type: 'auth:error', error: 'Access revoked' });
            socket.close(4403, 'Access revoked');
            return;
          }
          context.role = access.role;
          context.checkedAtMs = Date.now();
        }

        if (payload.type === 'presence:update') {
          const presence: ParticipantPresence = {
            userId: context.userId,
            email: context.email,
            displayName: context.email,
            color: participantColor(context.userId),
            cursorX: payload.presence.cursorX,
            cursorY: payload.presence.cursorY,
            selectedAnnotationId: payload.presence.selectedAnnotationId,
          };
          await collabRoomHub.setPresence(context.documentId, context.userId, presence);
          await collabRoomHub.publish(context.documentId, {
            type: 'presence:update',
            presence,
          });
          return;
        }

        if (payload.type === 'annotation:op') {
          if (!can(context.role as 'admin' | 'editor' | 'viewer', 'collab:edit')) {
            send(socket, { type: 'error', error: 'Read-only role' });
            return;
          }

          if (!isValidAnnotationOp(payload.op)) {
            send(socket, { type: 'error', error: 'Invalid annotation op' });
            return;
          }

          const nextVersion = await applyAnnotationOpToDocument(
            options.db,
            context.documentId,
            payload.op
          );
          if (nextVersion === null) {
            send(socket, { type: 'error', error: 'Annotation op rejected' });
            return;
          }

          await collabRoomHub.publish(context.documentId, {
            type: 'annotation:op',
            op: payload.op,
            userId: context.userId,
            version: nextVersion,
          });
        }
      })().catch((error) => request.log.error(error));
    });
  });
}

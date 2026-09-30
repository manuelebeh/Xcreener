import websocket from '@fastify/websocket';
import {
  type AnnotationOp,
  COLLAB_WS_PATH,
  type CollabServerMessage,
  isCollabClientMessage,
  type ParticipantPresence,
  participantColor,
} from '@snapglow/collab-core';
import { can } from '@snapglow/team-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { WebSocket } from 'ws';
import * as schema from '../db/schema';
import { env } from '../env';
import { upsertAuthUser } from '../plugins/auth';
import { ensurePaidWorkspace, resolveDocumentAccess } from '../routes/collab';
import { applyAnnotationOp } from '../services/collab-ops';
import { collabRoomHub } from '../services/collab-room';

const jwks = createRemoteJWKSet(new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`));

interface CollabRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

interface SocketContext {
  userId: string;
  email: string | null;
  documentId: string;
  role: string;
  socket: WebSocket;
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
  await app.register(websocket);

  app.get(COLLAB_WS_PATH, { websocket: true }, (socket, request) => {
    let context: SocketContext | null = null;
    let unsubscribe: (() => Promise<void>) | null = null;

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

            const email = typeof jwtPayload.email === 'string' ? jwtPayload.email : null;
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

            send(socket, {
              type: 'auth:ok',
              userId: user.id,
              role: access.role,
              version: access.doc.version,
              participants: await buildParticipants(payload.documentId),
            });
          } catch {
            send(socket, { type: 'auth:error', error: 'Unauthorized' });
          }
          return;
        }

        if (!context) {
          send(socket, { type: 'error', error: 'Not authenticated' });
          return;
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

          const rows = await options.db
            .select()
            .from(schema.collabDocuments)
            .where(eq(schema.collabDocuments.id, context.documentId))
            .limit(1);
          const doc = rows[0];
          if (!doc) {
            send(socket, { type: 'error', error: 'Document not found' });
            return;
          }

          const nextState = applyAnnotationOp(doc.documentState, payload.op as AnnotationOp);
          const nextVersion = doc.version + 1;

          await options.db
            .update(schema.collabDocuments)
            .set({
              documentState: nextState,
              version: nextVersion,
              updatedAt: new Date(),
            })
            .where(eq(schema.collabDocuments.id, context.documentId));

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

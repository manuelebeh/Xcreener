import type { NotificationType } from '@snapglow/collab-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { env } from '../env';
import { collabRoomHub } from './collab-room';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
}

export async function createNotification(
  db: PostgresJsDatabase<typeof schema>,
  input: CreateNotificationInput
): Promise<schema.Notification> {
  const [row] = await db
    .insert(schema.notifications)
    .values({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
    })
    .returning();

  if (!row) {
    throw new Error('Failed to create notification');
  }

  const documentId =
    typeof input.payload.documentId === 'string' ? input.payload.documentId : null;
  if (documentId) {
    await collabRoomHub.publish(documentId, {
      type: 'notification:created',
      notification: {
        id: row.id,
        type: row.type,
        payload: row.payload ?? {},
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      },
    });
  }

  return row;
}

export async function notifyDocumentParticipants(
  db: PostgresJsDatabase<typeof schema>,
  options: {
    documentId: string;
    workspaceId: string;
    actorUserId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    mentionUserIds?: string[];
  }
): Promise<void> {
  const members = await db
    .select({ userId: schema.workspaceMembers.userId })
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, options.workspaceId));

  const targets = new Set<string>();
  for (const member of members) {
    if (member.userId !== options.actorUserId) {
      targets.add(member.userId);
    }
  }
  for (const mentionUserId of options.mentionUserIds ?? []) {
    if (mentionUserId !== options.actorUserId) {
      targets.add(mentionUserId);
    }
  }

  await Promise.all(
    [...targets].map((userId) =>
      createNotification(db, {
        userId,
        type: options.type,
        payload: options.payload,
      })
    )
  );
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
      }),
    });
    if (!response.ok) {
      console.error('Resend email failed', await response.text());
    }
    return;
  }

  if (env.SMTP_URL) {
    console.info(`[email stub smtp] to=${options.to} subject=${options.subject}`);
  }
}

export async function sendCommentNotificationEmails(
  db: PostgresJsDatabase<typeof schema>,
  options: {
    mentionUserIds: string[];
    actorEmail: string | null;
    documentTitle: string;
    collabUrl: string;
    body: string;
  }
): Promise<void> {
  if (options.mentionUserIds.length === 0) {
    return;
  }

  const users = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users);

  const mentioned = users.filter(
    (user) => options.mentionUserIds.includes(user.id) && user.email
  );

  await Promise.all(
    mentioned.map((user) =>
      sendTransactionalEmail({
        to: user.email as string,
        subject: `${options.actorEmail ?? 'Someone'} mentioned you on ${options.documentTitle}`,
        text: `${options.actorEmail ?? 'Someone'} mentioned you in a comment on "${options.documentTitle}".\n\n${options.body}\n\nOpen: ${options.collabUrl}`,
      })
    )
  );
}

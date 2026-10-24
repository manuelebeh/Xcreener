import {
  type BrandKitConfig,
  computeInvitationExpiresAt,
  type InvitationResponse,
  isInvitationExpired,
  isMemberLimitReached,
  isWorkspaceRole,
  type MemberResponse,
  type SsoStatusResponse,
  type WorkspaceResponse,
  type WorkspaceRole,
} from '@snapglow/team-core';
import { and, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import * as schema from '../db/schema';
import { env } from '../env';
import { allowOrReply } from '../lib/rate-limit';
import { authenticateRequest, upsertAuthUser } from '../plugins/auth';
import { requireWorkspaceRole, resolveMembership } from '../plugins/workspace-auth';
import { createAuth0Organization } from '../services/auth0-management';
import type { StorageService } from '../services/storage';

interface WorkspaceRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
}

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function uniqueSlug(
  db: PostgresJsDatabase<typeof schema>,
  baseName: string
): Promise<string> {
  const base = slugifyName(baseName) || 'workspace';
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await db
      .select({ id: schema.workspaces.id })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.slug, candidate))
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function countWorkspaceMembers(
  db: Database | Transaction,
  workspaceId: string
): Promise<number> {
  const rows = await db
    .select()
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
  return rows.length;
}

/** True when `userId` is the only admin: demoting or removing them would leave nobody to manage billing. */
async function isLastAdmin(db: Database, workspaceId: string, userId: string): Promise<boolean> {
  const admins = await db
    .select({ userId: schema.workspaceMembers.userId })
    .from(schema.workspaceMembers)
    .where(
      and(
        eq(schema.workspaceMembers.workspaceId, workspaceId),
        eq(schema.workspaceMembers.role, 'admin')
      )
    );
  return admins.length === 1 && admins[0]?.userId === userId;
}

async function toWorkspaceResponse(
  db: PostgresJsDatabase<typeof schema>,
  workspace: schema.Workspace,
  role: WorkspaceRole
): Promise<WorkspaceResponse> {
  const memberCount = await countWorkspaceMembers(db, workspace.id);
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    auth0OrgId: workspace.auth0OrgId,
    role,
    memberCount,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

function inviteDeepLink(token: string): string {
  return `snapglow://team/invite?token=${token}`;
}

function toInvitationResponse(invitation: schema.Invitation): InvitationResponse {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    token: invitation.token,
    inviteUrl: inviteDeepLink(invitation.token),
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
  };
}

async function toBrandKitResponse(
  storage: StorageService,
  kit: schema.BrandKit | undefined
): Promise<BrandKitConfig> {
  if (!kit) {
    return {
      colors: {},
      fonts: {},
      watermark: {},
      logoUrl: null,
      updatedAt: null,
    };
  }

  return {
    colors: kit.colors ?? {},
    fonts: kit.fonts ?? {},
    watermark: kit.watermark ?? {},
    logoUrl: kit.logoStorageKey ? await storage.getPresignedUrl(kit.logoStorageKey) : null,
    updatedAt: kit.updatedAt.toISOString(),
  };
}

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  options: WorkspaceRouteOptions
) {
  app.decorate('db', options.db);

  app.post('/v1/workspaces', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return reply.code(400).send({ error: 'Missing workspace name' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
    const slug = await uniqueSlug(options.db, name);
    const now = new Date();

    const [workspace] = await options.db
      .insert(schema.workspaces)
      .values({
        name,
        slug,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!workspace) {
      return reply.code(500).send({ error: 'Failed to create workspace' });
    }

    await options.db.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'admin',
    });

    const response = await toWorkspaceResponse(options.db, workspace, 'admin');
    return reply.code(201).send(response);
  });

  app.get('/v1/workspaces', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);

    const rows = await options.db
      .select({
        workspace: schema.workspaces,
        role: schema.workspaceMembers.role,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspaceMembers.workspaceId))
      .where(eq(schema.workspaceMembers.userId, user.id));

    const workspaces = await Promise.all(
      rows.map((row) => toWorkspaceResponse(options.db, row.workspace, row.role))
    );

    return reply.send({ workspaces });
  });

  app.get(
    '/v1/workspaces/:id',
    { preHandler: [authenticateRequest, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      const role = request.workspaceRole;
      if (!workspaceId || !role) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const rows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = rows[0];

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      return reply.send(await toWorkspaceResponse(options.db, workspace, role));
    }
  );

  app.patch(
    '/v1/workspaces/:id',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const body = request.body as { name?: string };
      const name = body.name?.trim();
      if (!name) {
        return reply.code(400).send({ error: 'Missing workspace name' });
      }

      const [workspace] = await options.db
        .update(schema.workspaces)
        .set({ name, updatedAt: new Date() })
        .where(eq(schema.workspaces.id, workspaceId))
        .returning();

      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      return reply.send(await toWorkspaceResponse(options.db, workspace, 'admin'));
    }
  );

  app.get(
    '/v1/workspaces/:id/members',
    { preHandler: [authenticateRequest, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const rows = await options.db
        .select({
          userId: schema.workspaceMembers.userId,
          role: schema.workspaceMembers.role,
          joinedAt: schema.workspaceMembers.joinedAt,
          email: schema.users.email,
        })
        .from(schema.workspaceMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.workspaceMembers.userId))
        .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

      const members: MemberResponse[] = rows.map((row) => ({
        userId: row.userId,
        email: row.email,
        role: row.role,
        joinedAt: row.joinedAt.toISOString(),
      }));

      return reply.send({ members });
    }
  );

  app.patch(
    '/v1/workspaces/:id/members/:userId',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      const { userId } = request.params as { userId: string };
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const body = request.body as { role?: string };
      if (!body.role || !isWorkspaceRole(body.role)) {
        return reply.code(400).send({ error: 'Invalid role' });
      }
      if (body.role !== 'admin' && (await isLastAdmin(options.db, workspaceId, userId))) {
        return reply.code(409).send({ error: 'A workspace needs at least one admin' });
      }

      const [updated] = await options.db
        .update(schema.workspaceMembers)
        .set({ role: body.role })
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, workspaceId),
            eq(schema.workspaceMembers.userId, userId)
          )
        )
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: 'Member not found' });
      }

      const userRows = await options.db
        .select({ email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const member: MemberResponse = {
        userId: updated.userId,
        email: userRows[0]?.email ?? null,
        role: updated.role,
        joinedAt: updated.joinedAt.toISOString(),
      };

      return reply.send(member);
    }
  );

  app.delete(
    '/v1/workspaces/:id/members/:userId',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      const { userId } = request.params as { userId: string };
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      if (await isLastAdmin(options.db, workspaceId, userId)) {
        return reply.code(409).send({ error: 'A workspace needs at least one admin' });
      }

      const deleted = await options.db
        .delete(schema.workspaceMembers)
        .where(
          and(
            eq(schema.workspaceMembers.workspaceId, workspaceId),
            eq(schema.workspaceMembers.userId, userId)
          )
        )
        .returning();

      if (!deleted[0]) {
        return reply.code(404).send({ error: 'Member not found' });
      }

      return reply.code(204).send();
    }
  );

  app.post(
    '/v1/workspaces/:id/invitations',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const authUser = request.authUser;
      const workspaceId = request.workspaceId;
      if (!authUser || !workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const body = request.body as { email?: string; role?: string };
      const role = body.role ?? 'viewer';
      if (!isWorkspaceRole(role)) {
        return reply.code(400).send({ error: 'Invalid role' });
      }

      const email = body.email?.trim().toLowerCase() || null;

      const workspaceRows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = workspaceRows[0];
      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      const memberCount = await countWorkspaceMembers(options.db, workspaceId);
      if (isMemberLimitReached(workspace.plan, memberCount)) {
        return reply.code(403).send({ error: 'Member limit reached for workspace plan' });
      }

      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      const token = nanoid(24);
      const expiresAt = computeInvitationExpiresAt();

      const [invitation] = await options.db
        .insert(schema.invitations)
        .values({
          workspaceId,
          email,
          role,
          token,
          invitedBy: user.id,
          expiresAt,
        })
        .returning();

      if (!invitation) {
        return reply.code(500).send({ error: 'Failed to create invitation' });
      }

      return reply.code(201).send(toInvitationResponse(invitation));
    }
  );

  app.delete(
    '/v1/workspaces/:id/invitations/:invitationId',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      const { invitationId } = request.params as { invitationId: string };
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const deleted = await options.db
        .delete(schema.invitations)
        .where(
          and(
            eq(schema.invitations.id, invitationId),
            eq(schema.invitations.workspaceId, workspaceId)
          )
        )
        .returning();

      if (!deleted[0]) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      return reply.code(204).send();
    }
  );

  app.post(
    '/v1/invitations/:token/accept',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const authUser = request.authUser;
      if (!authUser) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { token } = request.params as { token: string };
      const user = await upsertAuthUser(options.db, authUser.auth0Sub, authUser.email);
      if (!(await allowOrReply(reply, 'invite-accept', user.id, 20, 3600, { failClosed: true }))) {
        return reply;
      }

      const invitationRows = await options.db
        .select()
        .from(schema.invitations)
        .where(eq(schema.invitations.token, token))
        .limit(1);
      const invitation = invitationRows[0];

      if (!invitation) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      if (invitation.acceptedAt) {
        return reply.code(409).send({ error: 'Invitation already accepted' });
      }

      if (isInvitationExpired(invitation.expiresAt)) {
        return reply.code(410).send({ error: 'Invitation expired' });
      }

      // Compare with this token's verified email: the stored one may predate verification.
      const verifiedEmail = authUser.email?.toLowerCase();
      if (invitation.email && verifiedEmail !== invitation.email.toLowerCase()) {
        return reply.code(403).send({ error: 'Email does not match invitation' });
      }

      const existingMembership = await resolveMembership(
        options.db,
        invitation.workspaceId,
        user.id
      );
      if (existingMembership) {
        return reply.code(409).send({ error: 'Already a workspace member' });
      }

      // The workspace row lock serializes accepts, so the member limit holds; the conditional
      // update makes a link invitation single use even under concurrent accepts.
      const result = await options.db.transaction(async (tx) => {
        const [workspace] = await tx
          .select()
          .from(schema.workspaces)
          .where(eq(schema.workspaces.id, invitation.workspaceId))
          .limit(1)
          .for('update');
        if (!workspace) {
          return { status: 404 as const, error: 'Workspace not found' };
        }

        const memberCount = await countWorkspaceMembers(tx, invitation.workspaceId);
        if (isMemberLimitReached(workspace.plan, memberCount)) {
          return { status: 403 as const, error: 'Member limit reached for workspace plan' };
        }

        const [claimed] = await tx
          .update(schema.invitations)
          .set({ acceptedAt: new Date() })
          .where(
            and(eq(schema.invitations.id, invitation.id), isNull(schema.invitations.acceptedAt))
          )
          .returning();
        if (!claimed) {
          return { status: 409 as const, error: 'Invitation already accepted' };
        }

        await tx.insert(schema.workspaceMembers).values({
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        });
        return { status: 200 as const, workspace };
      });

      if (result.status !== 200) {
        return reply.code(result.status).send({ error: result.error });
      }

      const response = await toWorkspaceResponse(options.db, result.workspace, invitation.role);
      return reply.send(response);
    }
  );

  app.get(
    '/v1/workspaces/:id/brand-kit',
    { preHandler: [authenticateRequest, requireWorkspaceRole('viewer')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const rows = await options.db
        .select()
        .from(schema.brandKits)
        .where(eq(schema.brandKits.workspaceId, workspaceId))
        .limit(1);

      return reply.send(await toBrandKitResponse(options.storage, rows[0]));
    }
  );

  app.put(
    '/v1/workspaces/:id/brand-kit',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const body = request.body as {
        colors?: BrandKitConfig['colors'];
        fonts?: BrandKitConfig['fonts'];
        watermark?: BrandKitConfig['watermark'];
      };

      const workspaceRows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = workspaceRows[0];
      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      if (workspace.plan === 'free') {
        return reply.code(403).send({ error: 'Brand kit editing requires a paid plan' });
      }

      const now = new Date();
      const [kit] = await options.db
        .insert(schema.brandKits)
        .values({
          workspaceId,
          colors: body.colors ?? {},
          fonts: body.fonts ?? {},
          watermark: body.watermark ?? {},
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.brandKits.workspaceId,
          set: {
            colors: body.colors ?? {},
            fonts: body.fonts ?? {},
            watermark: body.watermark ?? {},
            updatedAt: now,
          },
        })
        .returning();

      return reply.send(await toBrandKitResponse(options.storage, kit));
    }
  );

  app.post(
    '/v1/workspaces/:id/brand-kit/logo',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const workspaceRows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = workspaceRows[0];
      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      if (workspace.plan === 'free') {
        return reply.code(403).send({ error: 'Brand kit editing requires a paid plan' });
      }

      const multipart = await request.file();
      if (!multipart) {
        return reply.code(400).send({ error: 'Missing file upload' });
      }

      const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!allowed.includes(multipart.mimetype)) {
        return reply.code(400).send({ error: 'Unsupported logo type' });
      }

      const buffer = await multipart.toBuffer();
      if (buffer.byteLength > 2 * 1024 * 1024) {
        return reply.code(413).send({ error: 'Logo too large' });
      }

      const storageKey = `brand-kits/${workspaceId}/logo`;
      await options.storage.uploadObject(storageKey, buffer, multipart.mimetype);

      const now = new Date();
      const [kit] = await options.db
        .insert(schema.brandKits)
        .values({
          workspaceId,
          logoStorageKey: storageKey,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.brandKits.workspaceId,
          set: {
            logoStorageKey: storageKey,
            updatedAt: now,
          },
        })
        .returning();

      return reply.send(await toBrandKitResponse(options.storage, kit));
    }
  );

  app.get(
    '/v1/workspaces/:id/sso',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const rows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = rows[0];
      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      const response: SsoStatusResponse = {
        enabled: Boolean(workspace.auth0OrgId),
        auth0OrgId: workspace.auth0OrgId,
        setupUrl: workspace.auth0OrgId
          ? `https://${env.AUTH0_DOMAIN}/dashboard/organizations/${workspace.auth0OrgId}`
          : null,
      };

      return reply.send(response);
    }
  );

  app.post(
    '/v1/workspaces/:id/sso/enable',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const rows = await options.db
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .limit(1);
      const workspace = rows[0];
      if (!workspace) {
        return reply.code(404).send({ error: 'Workspace not found' });
      }

      if (workspace.plan !== 'team_pro') {
        return reply.code(403).send({ error: 'SSO requires Team Pro plan' });
      }

      if (workspace.auth0OrgId) {
        const response: SsoStatusResponse = {
          enabled: true,
          auth0OrgId: workspace.auth0OrgId,
          setupUrl: `https://${env.AUTH0_DOMAIN}/dashboard/organizations/${workspace.auth0OrgId}`,
        };
        return reply.send(response);
      }

      const org = await createAuth0Organization(workspace.name, workspace.slug);
      if (!org) {
        return reply.code(503).send({
          error:
            'Auth0 Management API not configured. Create an organization manually in Auth0 dashboard.',
        });
      }

      const [updated] = await options.db
        .update(schema.workspaces)
        .set({ auth0OrgId: org.id, updatedAt: new Date() })
        .where(eq(schema.workspaces.id, workspaceId))
        .returning();

      const response: SsoStatusResponse = {
        enabled: true,
        auth0OrgId: updated?.auth0OrgId ?? org.id,
        setupUrl: `https://${env.AUTH0_DOMAIN}/dashboard/organizations/${org.id}`,
      };

      return reply.send(response);
    }
  );
}

export { resolveMembership };

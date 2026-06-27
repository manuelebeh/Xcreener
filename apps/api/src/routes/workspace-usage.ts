import {
  parseUsagePeriod,
  type UsagePeriod,
  type WorkspaceUsageResponse,
  usagePeriodDays,
} from '@snapglow/team-core';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import * as schema from '../db/schema';
import { authenticateRequest } from '../plugins/auth';
import { requireWorkspaceRole } from '../plugins/workspace-auth';

interface WorkspaceUsageRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
}

function periodStart(period: UsagePeriod, now = new Date()): Date {
  const days = usagePeriodDays(period);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function registerWorkspaceUsageRoutes(
  app: FastifyInstance,
  options: WorkspaceUsageRouteOptions
) {
  app.get(
    '/v1/workspaces/:id/usage',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(400).send({ error: 'Missing workspace id' });
      }

      const query = request.query as { period?: string };
      const period = parseUsagePeriod(query.period);
      const from = periodStart(period);
      const to = new Date();

      const libraryRows = await options.db
        .select({
          userId: schema.libraryItems.userId,
          email: schema.users.email,
          count: sql<number>`count(*)::int`,
          bytes: sql<number>`coalesce(sum(${schema.libraryItems.byteSize}), 0)::int`,
        })
        .from(schema.libraryItems)
        .innerJoin(schema.users, eq(schema.libraryItems.userId, schema.users.id))
        .where(
          and(
            eq(schema.libraryItems.workspaceId, workspaceId),
            gte(schema.libraryItems.createdAt, from)
          )
        )
        .groupBy(schema.libraryItems.userId, schema.users.email);

      const shareRows = await options.db
        .select({
          userId: schema.shares.userId,
          email: schema.users.email,
          count: sql<number>`count(*)::int`,
          bytes: sql<number>`coalesce(sum(${schema.shares.byteSize}), 0)::int`,
        })
        .from(schema.shares)
        .innerJoin(schema.users, eq(schema.shares.userId, schema.users.id))
        .where(
          and(eq(schema.shares.workspaceId, workspaceId), gte(schema.shares.createdAt, from))
        )
        .groupBy(schema.shares.userId, schema.users.email);

      const [apiCaptureStats] = await options.db
        .select({
          count: sql<number>`count(*)::int`,
          exportCount: sql<number>`count(${schema.apiCaptures.exportStorageKey})::int`,
        })
        .from(schema.apiCaptures)
        .where(
          and(
            eq(schema.apiCaptures.workspaceId, workspaceId),
            gte(schema.apiCaptures.createdAt, from)
          )
        );

      const [libraryTotals] = await options.db
        .select({
          count: sql<number>`count(*)::int`,
          bytes: sql<number>`coalesce(sum(${schema.libraryItems.byteSize}), 0)::int`,
        })
        .from(schema.libraryItems)
        .where(
          and(
            eq(schema.libraryItems.workspaceId, workspaceId),
            gte(schema.libraryItems.createdAt, from)
          )
        );

      const [shareTotals] = await options.db
        .select({
          count: sql<number>`count(*)::int`,
          bytes: sql<number>`coalesce(sum(${schema.shares.byteSize}), 0)::int`,
        })
        .from(schema.shares)
        .where(
          and(eq(schema.shares.workspaceId, workspaceId), gte(schema.shares.createdAt, from))
        );

      const memberMap = new Map<
        string,
        {
          userId: string;
          email: string | null;
          libraryCaptures: number;
          shares: number;
          storageBytes: number;
        }
      >();

      for (const row of libraryRows) {
        memberMap.set(row.userId, {
          userId: row.userId,
          email: row.email,
          libraryCaptures: row.count,
          shares: 0,
          storageBytes: row.bytes,
        });
      }

      for (const row of shareRows) {
        const existing = memberMap.get(row.userId);
        if (existing) {
          existing.shares = row.count;
          existing.storageBytes += row.bytes;
        } else {
          memberMap.set(row.userId, {
            userId: row.userId,
            email: row.email,
            libraryCaptures: 0,
            shares: row.count,
            storageBytes: row.bytes,
          });
        }
      }

      const response: WorkspaceUsageResponse = {
        period: { from: from.toISOString(), to: to.toISOString() },
        totals: {
          libraryCaptures: libraryTotals?.count ?? 0,
          shares: shareTotals?.count ?? 0,
          apiCaptures: apiCaptureStats?.count ?? 0,
          exportCount: apiCaptureStats?.exportCount ?? 0,
          storageBytes: (libraryTotals?.bytes ?? 0) + (shareTotals?.bytes ?? 0),
        },
        byMember: [...memberMap.values()].sort((a, b) => {
          const aTotal = a.libraryCaptures + a.shares;
          const bTotal = b.libraryCaptures + b.shares;
          return bTotal - aTotal;
        }),
      };

      return reply.send(response);
    }
  );
}

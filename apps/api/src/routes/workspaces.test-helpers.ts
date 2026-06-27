import * as schema from '../db/schema';

export interface TestUser {
  id: string;
  auth0Sub: string;
  email: string | null;
}

export interface MemoryState {
  users: schema.User[];
  workspaces: schema.Workspace[];
  members: schema.WorkspaceMember[];
  invitations: schema.Invitation[];
}

function matchesWhere<T extends Record<string, unknown>>(
  row: T,
  whereCapture: Record<string, unknown>
): boolean {
  if (Object.keys(whereCapture).length === 0) {
    return true;
  }
  return Object.entries(whereCapture).every(([key, value]) => {
    const camelKey = key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
    return row[camelKey as keyof T] === value || row[key as keyof T] === value;
  });
}

function createMemoryDb(state: MemoryState, whereCapture: Record<string, unknown>) {
  let selectContext: {
    table: unknown;
    fields?: Record<string, unknown>;
    joins: unknown[];
  } | null = null;
  let activeWhere: Record<string, unknown> = {};

  const executeSelect = (limit?: number) => {
    if (selectContext?.table === schema.workspaces) {
      const rows = state.workspaces.filter((row) => matchesWhere(row, activeWhere));
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    }

    if (selectContext?.table === schema.workspaceMembers) {
      if (selectContext.joins.includes(schema.workspaces)) {
        const rows = state.members
          .filter((member) => matchesWhere(member, activeWhere))
          .map((member) => {
            const workspace = state.workspaces.find((ws) => ws.id === member.workspaceId);
            if (!workspace) {
              return null;
            }
            return { workspace, role: member.role };
          })
          .filter(
            (row): row is { workspace: schema.Workspace; role: schema.WorkspaceMember['role'] } =>
              Boolean(row)
          );
        return typeof limit === 'number' ? rows.slice(0, limit) : rows;
      }

      if (selectContext.joins.includes(schema.users)) {
        const rows = state.members
          .filter((member) => matchesWhere(member, activeWhere))
          .map((member) => {
            const user = state.users.find((u) => u.id === member.userId);
            return {
              userId: member.userId,
              role: member.role,
              joinedAt: member.joinedAt,
              email: user?.email ?? null,
            };
          });
        return typeof limit === 'number' ? rows.slice(0, limit) : rows;
      }

      const rows = state.members.filter((row) => matchesWhere(row, activeWhere));
      if (selectContext.fields && 'value' in selectContext.fields) {
        return [{ value: rows.length }];
      }
      if (selectContext.fields && 'role' in selectContext.fields && !('value' in selectContext.fields)) {
        const mapped = rows.map((row) => ({ role: row.role }));
        return typeof limit === 'number' ? mapped.slice(0, limit) : mapped;
      }
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    }

    if (selectContext?.table === schema.invitations) {
      const rows = state.invitations.filter((row) => matchesWhere(row, activeWhere));
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    }

    if (selectContext?.table === schema.users) {
      const rows = state.users.filter((row) => matchesWhere(row, activeWhere));
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    }

    return [];
  };

  const db = {
    select: (fields?: Record<string, unknown>) => {
      Object.keys(whereCapture).forEach((key) => {
        delete whereCapture[key];
      });
      activeWhere = {};
      selectContext = { table: null, fields, joins: [] };
      return {
        from: (table: unknown) => {
          if (!selectContext) {
            throw new Error('Missing select context');
          }
          selectContext.table = table;

          const chain = {
            innerJoin: (joinTable: unknown) => {
              selectContext?.joins.push(joinTable);
              return chain;
            },
            where: () => {
              activeWhere = { ...whereCapture };
              const run = () => Promise.resolve(executeSelect());
              return Object.assign(run(), {
                limit: async (limit: number) => executeSelect(limit),
              });
            },
          };

          return chain;
        },
      };
    },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
        const persist = async () => {
          const rows = Array.isArray(values) ? values : [values];

          if (table === schema.workspaces) {
            const created = rows.map((row) => {
              const workspace: schema.Workspace = {
                id: crypto.randomUUID(),
                name: String(row.name),
                slug: String(row.slug),
                plan: (row.plan as schema.Workspace['plan']) ?? 'free',
                auth0OrgId: (row.auth0OrgId as string | null) ?? null,
                createdBy: String(row.createdBy),
                createdAt: (row.createdAt as Date) ?? new Date(),
                updatedAt: (row.updatedAt as Date) ?? new Date(),
              };
              state.workspaces.push(workspace);
              return workspace;
            });
            return created;
          }

          if (table === schema.workspaceMembers) {
            const created = rows.map((row) => {
              const member: schema.WorkspaceMember = {
                workspaceId: String(row.workspaceId),
                userId: String(row.userId),
                role: row.role as schema.WorkspaceMember['role'],
                joinedAt: (row.joinedAt as Date) ?? new Date(),
              };
              state.members.push(member);
              return member;
            });
            return created;
          }

          if (table === schema.invitations) {
            const created = rows.map((row) => {
              const invitation: schema.Invitation = {
                id: crypto.randomUUID(),
                workspaceId: String(row.workspaceId),
                email: (row.email as string | null) ?? null,
                role: row.role as schema.Invitation['role'],
                token: String(row.token),
                invitedBy: String(row.invitedBy),
                expiresAt: row.expiresAt as Date,
                acceptedAt: (row.acceptedAt as Date | null) ?? null,
                createdAt: (row.createdAt as Date) ?? new Date(),
              };
              state.invitations.push(invitation);
              return invitation;
            });
            return created;
          }

          return [];
        };

        return {
          returning: async () => persist(),
          then: (
            onFulfilled: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) => persist().then(onFulfilled, onRejected),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          activeWhere = { ...whereCapture };
          const persist = async () => {
            if (table === schema.workspaces) {
              const workspace = state.workspaces.find((row) => matchesWhere(row, activeWhere));
              if (!workspace) {
                return [];
              }
              if (values.name) {
                workspace.name = String(values.name);
              }
              workspace.updatedAt = (values.updatedAt as Date) ?? new Date();
              return [workspace];
            }

            if (table === schema.workspaceMembers) {
              const member = state.members.find((row) => matchesWhere(row, activeWhere));
              if (!member) {
                return [];
              }
              if (values.role) {
                member.role = values.role as schema.WorkspaceMember['role'];
              }
              return [member];
            }

            if (table === schema.invitations) {
              const invitation = state.invitations.find((row) => matchesWhere(row, activeWhere));
              if (!invitation) {
                return [];
              }
              if (values.acceptedAt) {
                invitation.acceptedAt = values.acceptedAt as Date;
              }
              return [invitation];
            }

            return [];
          };

          return {
            returning: async () => persist(),
            then: (
              onFulfilled: (value: unknown) => unknown,
              onRejected?: (reason: unknown) => unknown
            ) => persist().then(onFulfilled, onRejected),
          };
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => {
        activeWhere = { ...whereCapture };
        return {
          returning: async () => {
            if (table === schema.workspaceMembers) {
              const index = state.members.findIndex((row) => matchesWhere(row, activeWhere));
              if (index === -1) {
                return [];
              }
              return state.members.splice(index, 1);
            }

            if (table === schema.invitations) {
              const index = state.invitations.findIndex((row) => matchesWhere(row, activeWhere));
              if (index === -1) {
                return [];
              }
              return state.invitations.splice(index, 1);
            }

            return [];
          },
        };
      },
    }),
  };

  return db;
}

export function resetMemoryState(): MemoryState {
  return {
    users: [
      {
        id: 'user-admin',
        auth0Sub: 'auth0|admin',
        email: 'admin@test.com',
        createdAt: new Date('2026-06-27T12:00:00.000Z'),
      },
      {
        id: 'user-viewer',
        auth0Sub: 'auth0|viewer',
        email: 'viewer@test.com',
        createdAt: new Date('2026-06-27T12:00:00.000Z'),
      },
    ],
    workspaces: [],
    members: [],
    invitations: [],
  };
}

export async function buildTestApp(
  state: MemoryState,
  whereCapture: Record<string, unknown>
) {
  const { buildApp } = await import('../app');
  const db = createMemoryDb(state, whereCapture);
  const storage = {
    ensureBucket: async () => {},
    uploadObject: async () => {},
    getPresignedUrl: async () => 'https://example.com/asset',
  };
  return buildApp({ db: db as never, storage: storage as never });
}

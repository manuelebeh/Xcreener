import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import type Stripe from 'stripe';
import * as schema from '../db/schema';
import { allowOrReply } from '../lib/rate-limit';
import { authenticateRequest } from '../plugins/auth';
import { BillingCancellationError, deleteUserAccount } from '../services/account-deletion';
import { deleteAuth0User } from '../services/auth0-management';
import type { StorageService } from '../services/storage';
import { getStripeClient } from './billing';

interface AccountRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  storage: StorageService;
  stripe?: Stripe | null;
  deleteIdentity?: (auth0Sub: string) => Promise<boolean>;
}

export async function registerAccountRoutes(app: FastifyInstance, options: AccountRouteOptions) {
  const stripe = options.stripe === undefined ? getStripeClient() : options.stripe;
  const deleteIdentity = options.deleteIdentity ?? deleteAuth0User;

  app.delete('/v1/users/me', { preHandler: authenticateRequest }, async (request, reply) => {
    const authUser = request.authUser;
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Look up without upserting: deleting an account must never create one.
    const rows = await options.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.auth0Sub, authUser.auth0Sub))
      .limit(1);
    const user = rows[0];
    if (!user) {
      return reply.code(204).send();
    }

    if (!(await allowOrReply(reply, 'account:delete', user.id, 3, 60 * 60))) {
      return;
    }

    let result: Awaited<ReturnType<typeof deleteUserAccount>>;
    try {
      result = await deleteUserAccount(options.db, options.storage, stripe, user.id);
    } catch (error) {
      if (error instanceof BillingCancellationError) {
        request.log.error({ err: error }, 'Account deletion stopped: subscription cancel failed');
        return reply.code(502).send({ error: 'Could not cancel the workspace subscription' });
      }
      throw error;
    }

    if (result.status === 'blocked') {
      return reply.code(409).send({
        error: 'Make another member an admin of these workspaces first',
        workspaces: result.workspaces,
      });
    }

    let identityDeleted = false;
    try {
      identityDeleted = await deleteIdentity(authUser.auth0Sub);
    } catch (error) {
      request.log.warn({ err: error }, 'Auth0 identity deletion failed');
    }
    if (!identityDeleted) {
      request.log.warn('Auth0 identity kept after account deletion');
    }

    return reply.send({ deleted: true, identityDeleted });
  });
}

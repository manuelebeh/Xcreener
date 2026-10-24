import type {
  BillingStatusResponse,
  CheckoutSessionResponse,
  WorkspacePlan,
} from '@snapglow/team-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import * as schema from '../db/schema';
import { env } from '../env';
import { authenticateRequest } from '../plugins/auth';
import { requireWorkspaceRole } from '../plugins/workspace-auth';

interface BillingRouteOptions {
  db: PostgresJsDatabase<typeof schema>;
  stripe?: Stripe;
}

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type SubscriptionStatus = (typeof schema.subscriptionStatusEnum.enumValues)[number];

/** Statuses that keep paid features. `past_due` covers Stripe's retry window before unpaid/cancel. */
const PAID_STATUSES: ReadonlySet<SubscriptionStatus> = new Set(['active', 'trialing', 'past_due']);

function getStripeClient(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

async function countWorkspaceMembers(
  db: PostgresJsDatabase<typeof schema>,
  workspaceId: string
): Promise<number> {
  const rows = await db
    .select()
    .from(schema.workspaceMembers)
    .where(eq(schema.workspaceMembers.workspaceId, workspaceId));
  return rows.length;
}

async function toBillingStatus(
  db: PostgresJsDatabase<typeof schema>,
  workspace: schema.Workspace
): Promise<BillingStatusResponse> {
  const memberCount = await countWorkspaceMembers(db, workspace.id);
  const subRows = await db
    .select()
    .from(schema.workspaceSubscriptions)
    .where(eq(schema.workspaceSubscriptions.workspaceId, workspace.id))
    .limit(1);
  const sub = subRows[0];

  const seatCount = sub?.seatCount ?? memberCount;
  return {
    plan: workspace.plan,
    status: sub?.status ?? null,
    seatCount,
    memberCount,
    seatMismatch: sub?.status === 'active' && seatCount < memberCount,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    stripeCustomerId: sub?.stripeCustomerId ?? null,
  };
}

async function updateWorkspacePlan(
  db: Database | Transaction,
  workspaceId: string,
  plan: WorkspacePlan,
  subscription: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: SubscriptionStatus;
    seatCount: number;
    currentPeriodEnd: Date | null;
  }
): Promise<void> {
  await db
    .update(schema.workspaces)
    .set({ plan, updatedAt: new Date() })
    .where(eq(schema.workspaces.id, workspaceId));

  await db
    .insert(schema.workspaceSubscriptions)
    .values({
      workspaceId,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      status: subscription.status,
      seatCount: subscription.seatCount,
      currentPeriodEnd: subscription.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.workspaceSubscriptions.workspaceId,
      set: {
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: subscription.status,
        seatCount: subscription.seatCount,
        currentPeriodEnd: subscription.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

function planFromPriceId(priceId: string): WorkspacePlan | null {
  if (priceId === env.STRIPE_PRICE_TEAM_STARTER) {
    return 'team_starter';
  }
  if (priceId === env.STRIPE_PRICE_TEAM_PRO) {
    return 'team_pro';
  }
  return null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const end = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return end ? new Date(end * 1000) : null;
}

/** Writes plan and subscription from a Stripe subscription. The plan is paid only while the status allows it. */
async function syncWorkspaceSubscription(
  tx: Transaction,
  workspaceId: string,
  subscription: Stripe.Subscription,
  fallbackPlan?: WorkspacePlan
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? '';
  const paidPlan = planFromPriceId(priceId) ?? fallbackPlan;
  if (!paidPlan) {
    return;
  }
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  await updateWorkspacePlan(
    tx,
    workspaceId,
    PAID_STATUSES.has(subscription.status) ? paidPlan : 'free',
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      seatCount: subscription.items.data[0]?.quantity ?? 1,
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
    }
  );
}

/**
 * Runs `apply` in one transaction unless a newer Stripe event already updated this workspace.
 * Stripe does not guarantee delivery order, and retries a failed event for days.
 */
async function applyStripeEvent(
  db: Database,
  workspaceId: string,
  event: Stripe.Event,
  apply: (tx: Transaction) => Promise<void>
): Promise<void> {
  const eventCreated = new Date(event.created * 1000);
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ lastEventCreated: schema.workspaceSubscriptions.lastEventCreated })
      .from(schema.workspaceSubscriptions)
      .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId))
      .limit(1)
      .for('update');
    if (current?.lastEventCreated && eventCreated < current.lastEventCreated) {
      return;
    }
    await apply(tx);
    await tx
      .update(schema.workspaceSubscriptions)
      .set({ lastEventCreated: eventCreated })
      .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId));
  });
}

export async function registerBillingRoutes(app: FastifyInstance, options: BillingRouteOptions) {
  const stripe = options.stripe ?? getStripeClient();

  app.get(
    '/v1/workspaces/:id/billing',
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

      return reply.send(await toBillingStatus(options.db, workspace));
    }
  );

  app.post(
    '/v1/workspaces/:id/billing/checkout',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      if (!stripe) {
        return reply.code(503).send({ error: 'Stripe not configured' });
      }

      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const body = request.body as { plan?: WorkspacePlan; referral?: string };
      const plan = body.plan ?? 'team_starter';
      if (plan !== 'team_starter' && plan !== 'team_pro') {
        return reply.code(400).send({ error: 'Invalid plan' });
      }

      const priceId =
        plan === 'team_starter' ? env.STRIPE_PRICE_TEAM_STARTER : env.STRIPE_PRICE_TEAM_PRO;
      if (!priceId) {
        return reply.code(503).send({ error: 'Stripe price not configured' });
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

      const memberCount = await countWorkspaceMembers(options.db, workspaceId);
      const subRows = await options.db
        .select()
        .from(schema.workspaceSubscriptions)
        .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId))
        .limit(1);
      const existingSub = subRows[0];

      let customerId = existingSub?.stripeCustomerId ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: workspace.name,
          metadata: { workspaceId },
        });
        customerId = customer.id;
      }

      const referral = typeof body.referral === 'string' ? body.referral.trim() : '';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: Math.max(1, memberCount) }],
        success_url: `${env.WEB_PUBLIC_URL}/settings?billing=success`,
        cancel_url: `${env.WEB_PUBLIC_URL}/settings?billing=cancel`,
        client_reference_id: referral || undefined,
        metadata: { workspaceId, plan, ...(referral ? { referral } : {}) },
        subscription_data: {
          metadata: { workspaceId, plan, ...(referral ? { referral } : {}) },
        },
      });

      if (!session.url) {
        return reply.code(500).send({ error: 'Failed to create checkout session' });
      }

      const response: CheckoutSessionResponse = { url: session.url };
      return reply.send(response);
    }
  );

  app.post(
    '/v1/workspaces/:id/billing/portal',
    { preHandler: [authenticateRequest, requireWorkspaceRole('admin')] },
    async (request, reply) => {
      if (!stripe) {
        return reply.code(503).send({ error: 'Stripe not configured' });
      }

      const workspaceId = request.workspaceId;
      if (!workspaceId) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const subRows = await options.db
        .select()
        .from(schema.workspaceSubscriptions)
        .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId))
        .limit(1);
      const customerId = subRows[0]?.stripeCustomerId;
      if (!customerId) {
        return reply.code(400).send({ error: 'No Stripe customer for this workspace' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${env.WEB_PUBLIC_URL}/settings?billing=portal`,
      });

      if (!session.url) {
        return reply.code(500).send({ error: 'Failed to create billing portal session' });
      }

      const response: CheckoutSessionResponse = { url: session.url };
      return reply.send(response);
    }
  );

  app.post('/v1/billing/webhook', async (request, reply) => {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.code(503).send({ error: 'Stripe webhook not configured' });
    }

    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return reply.code(400).send({ error: 'Missing stripe-signature header' });
    }

    const rawBody = request.body;
    if (!(rawBody instanceof Buffer)) {
      return reply.code(400).send({ error: 'Invalid webhook payload' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return reply.code(400).send({ error: 'Invalid webhook signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const plan = session.metadata?.plan as WorkspacePlan | undefined;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (workspaceId && plan && subscriptionId && customerId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applyStripeEvent(options.db, workspaceId, event, (tx) =>
            syncWorkspaceSubscription(tx, workspaceId, subscription, plan)
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) {
          break;
        }

        if (event.type === 'customer.subscription.deleted') {
          await applyStripeEvent(options.db, workspaceId, event, async (tx) => {
            await tx
              .update(schema.workspaces)
              .set({ plan: 'free', updatedAt: new Date() })
              .where(eq(schema.workspaces.id, workspaceId));
            await tx
              .update(schema.workspaceSubscriptions)
              .set({ status: 'canceled', updatedAt: new Date() })
              .where(eq(schema.workspaceSubscriptions.workspaceId, workspaceId));
          });
          break;
        }

        await applyStripeEvent(options.db, workspaceId, event, (tx) =>
          syncWorkspaceSubscription(tx, workspaceId, subscription)
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceSubscription = (
          invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
        ).subscription;
        const subscriptionId =
          typeof invoiceSubscription === 'string' ? invoiceSubscription : invoiceSubscription?.id;
        if (!subscriptionId) {
          break;
        }
        // Re-fetched, so the status is current (past_due, unpaid, canceled...), not assumed.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const workspaceId = subscription.metadata?.workspaceId;
        if (workspaceId) {
          await applyStripeEvent(options.db, workspaceId, event, (tx) =>
            syncWorkspaceSubscription(tx, workspaceId, subscription)
          );
        }
        break;
      }
    }

    return reply.send({ received: true });
  });
}

export { getStripeClient, toBillingStatus, updateWorkspacePlan };

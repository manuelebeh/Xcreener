import { isPaidPlan } from '@xcreener/team-core';
import { Button } from '@xcreener/ui';
import { useState } from 'react';
import { useTeamStore } from '../store';

export function BillingSection() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );
  const billing = useTeamStore((state) => state.billing);
  const startCheckout = useTeamStore((state) => state.startCheckout);
  const openBillingPortal = useTeamStore((state) => state.openBillingPortal);
  const enableTeamSso = useTeamStore((state) => state.enableTeamSso);
  const ssoEnabled = useTeamStore((state) => state.ssoEnabled);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (activeWorkspace?.role !== 'admin') {
    return null;
  }

  async function handleCheckout(plan: 'team_starter' | 'team_pro') {
    setCheckoutError(null);
    try {
      await startCheckout(plan);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed');
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setCheckoutError(null);
    try {
      await openBillingPortal();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Billing & SSO</p>
      <p className="m-0 text-xs text-muted">
        Plan: {billing?.plan ?? activeWorkspace.plan}
        {billing?.status ? ` · ${billing.status}` : ''}
        {billing ? ` · ${billing.memberCount} members` : ''}
      </p>
      {billing?.seatMismatch ? (
        <p className="text-xs text-destructive" role="alert">
          Fewer seats than editors and admins. Update subscription in Stripe.
        </p>
      ) : null}
      {!isPaidPlan(activeWorkspace.plan) ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void handleCheckout('team_starter')}>
            Upgrade to Team Starter
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void handleCheckout('team_pro')}
          >
            Upgrade to Team Pro
          </Button>
        </div>
      ) : null}
      {billing?.stripeCustomerId ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={portalLoading}
          onClick={() => void handlePortal()}
        >
          {portalLoading ? 'Opening…' : 'Manage subscription'}
        </Button>
      ) : null}
      {checkoutError ? (
        <p className="text-xs text-destructive" role="alert">
          {checkoutError}
        </p>
      ) : null}
      {activeWorkspace.plan === 'team_pro' ? (
        <div>
          <p className="text-xs text-muted">SSO: {ssoEnabled ? 'Enabled' : 'Not configured'}</p>
          {!ssoEnabled ? (
            <Button type="button" size="sm" className="mt-2" onClick={() => void enableTeamSso()}>
              Enable SSO
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

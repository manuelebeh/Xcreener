import { Button } from '@snapglow/ui';
import { isPaidPlan } from '@snapglow/team-core';
import { useTeamStore } from '../store';
import { openBillingPortal } from '../auth-invite';

export function BillingSection() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );
  const billing = useTeamStore((state) => state.billing);
  const startCheckout = useTeamStore((state) => state.startCheckout);
  const enableTeamSso = useTeamStore((state) => state.enableTeamSso);
  const ssoEnabled = useTeamStore((state) => state.ssoEnabled);

  if (!activeWorkspace || activeWorkspace.role !== 'admin') {
    return null;
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
          Seat count is lower than member count. Update subscription in Stripe.
        </p>
      ) : null}
      {!isPaidPlan(activeWorkspace.plan) ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => void startCheckout('team_starter')}>
            Upgrade to Team Starter
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void startCheckout('team_pro')}
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
          onClick={() => void openBillingPortal(billing.stripeCustomerId!)}
        >
          Open Stripe customer
        </Button>
      ) : null}
      {activeWorkspace.plan === 'team_pro' ? (
        <div>
          <p className="text-xs text-muted">
            SSO: {ssoEnabled ? 'Enabled' : 'Not configured'}
          </p>
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

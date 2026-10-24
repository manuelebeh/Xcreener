import { createFileRoute, Link } from '@tanstack/react-router';

// Codes are not checked here: redemption will go through the API with single-use codes
// bound to an account (audit FINDING-019).
export const Route = createFileRoute('/redeem')({
  head: () => ({
    meta: [
      { title: 'Redeem partner code — SnapGlow' },
      { name: 'description', content: 'Redeem AppSumo, Setapp, or partner bundle codes.' },
    ],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm text-muted no-underline hover:text-foreground">
          ← SnapGlow
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">Redeem partner code</h1>
        <p className="mt-2 text-sm text-muted">
          Partner code redemption is not open yet. If you got an AppSumo, Setapp, or bundle code,
          keep it: you will redeem it here once it opens.
        </p>
        <Link to="/help" className="mt-4 inline-block text-sm font-medium text-primary">
          Help center
        </Link>
      </div>
    </div>
  );
}

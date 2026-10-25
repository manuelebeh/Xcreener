import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { captureReferralFromUrl } from '#/lib/affiliates/referral';

const REWARDFUL_PORTAL_URL =
  (import.meta.env.VITE_REWARDFUL_PORTAL_URL as string | undefined) ??
  'https://snapglow.getrewardful.com/signup';

export const Route = createFileRoute('/affiliates')({
  head: () => ({
    meta: [
      { title: 'Affiliate program — Xcreener' },
      {
        name: 'description',
        content: 'Earn 30% commission on first sales with the Xcreener affiliate program.',
      },
    ],
  }),
  component: AffiliatesPage,
});

function AffiliatesPage() {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-lg font-semibold tracking-tight no-underline text-foreground">
          Xcreener
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Affiliate program</h1>
        <p className="mt-3 text-lg text-muted">
          Earn <strong className="text-foreground">30% commission</strong> on the first sale for
          every customer you refer.
        </p>

        <ul className="mt-6 list-disc space-y-2 pl-5 text-muted">
          <li>Share your unique referral link</li>
          <li>Track clicks and conversions in your affiliate dashboard</li>
          <li>Get paid automatically via Rewardful + Stripe</li>
        </ul>

        <a
          href={REWARDFUL_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground no-underline transition-opacity hover:opacity-90"
        >
          Join the program
        </a>

        <p className="mt-6 text-sm text-muted">
          Already an affiliate?{' '}
          <a
            href={REWARDFUL_PORTAL_URL.replace('/signup', '/login')}
            className="text-primary underline"
          >
            Sign in to your dashboard
          </a>
        </p>
      </main>
    </div>
  );
}

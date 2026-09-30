import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

interface PartnerOffer {
  code: string;
  source: string;
  label: string;
}

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
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleRedeem() {
    setStatus(null);
    const response = await fetch('/partner_offers.json');
    const offers = (await response.json()) as PartnerOffer[];
    const match = offers.find((offer) => offer.code.toLowerCase() === code.trim().toLowerCase());
    if (!match) {
      setStatus('Invalid or expired code.');
      return;
    }
    setStatus(
      `Code valid for ${match.label}. Open SnapGlow desktop — your license source will be set to ${match.source}.`
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm text-muted no-underline hover:text-foreground">
          ← SnapGlow
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">Redeem partner code</h1>
        <p className="mt-2 text-sm text-muted">Enter your AppSumo, Setapp, or bundle code.</p>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="APPSUMO2026"
          className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleRedeem()}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Redeem
        </button>
        {status ? <p className="mt-4 text-sm text-muted">{status}</p> : null}
      </div>
    </div>
  );
}

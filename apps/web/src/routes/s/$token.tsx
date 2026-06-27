import type { PublicShareResponse } from '@snapglow/cloud-core';
import { createFileRoute, notFound } from '@tanstack/react-router';

const API_URL = process.env.API_URL ?? process.env.VITE_API_URL ?? 'http://localhost:8787';

async function fetchShare(token: string): Promise<PublicShareResponse> {
  const response = await fetch(`${API_URL}/v1/shares/${token}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw notFound();
  }

  if (response.status === 410) {
    throw new ShareExpiredError();
  }

  if (!response.ok) {
    throw new Error('Failed to load shared capture');
  }

  return (await response.json()) as PublicShareResponse;
}

class ShareExpiredError extends Error {
  constructor() {
    super('Share expired');
    this.name = 'ShareExpiredError';
  }
}

export const Route = createFileRoute('/s/$token')({
  loader: async ({ params }) => fetchShare(params.token),
  head: ({ loaderData }) => ({
    meta: [
      { title: 'Shared capture — SnapGlow' },
      { name: 'robots', content: 'noindex' },
      ...(loaderData?.assetUrl
        ? [{ property: 'og:image', content: loaderData.assetUrl }]
        : []),
    ],
  }),
  component: ShareViewerPage,
  errorComponent: ShareErrorPage,
});

function ShareViewerPage() {
  const share = Route.useLoaderData();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted">SnapGlow share</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Shared capture</h1>
        {share.expiresAt ? (
          <p className="text-sm text-muted">Expires {new Date(share.expiresAt).toLocaleString()}</p>
        ) : (
          <p className="text-sm text-muted">Permanent link</p>
        )}
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-surface p-3">
        {share.mimeType.startsWith('video/') ? (
          <video
            src={share.assetUrl}
            controls
            className="mx-auto max-h-[80vh] w-full rounded-lg"
            data-testid="share-viewer-video"
          />
        ) : (
          <img
            src={share.assetUrl}
            alt="Shared SnapGlow capture"
            className="mx-auto max-h-[80vh] w-full rounded-lg object-contain"
            data-testid="share-viewer-image"
          />
        )}
      </div>
    </main>
  );
}

function ShareErrorPage({ error }: { error: unknown }) {
  const isExpired = error instanceof ShareExpiredError;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-3 px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        {isExpired ? 'Link expired' : 'Share unavailable'}
      </h1>
      <p className="text-sm text-muted">
        {isExpired
          ? 'This share link has expired. Ask the sender for a new link.'
          : 'This share link is invalid or no longer available.'}
      </p>
    </main>
  );
}

import { createFileRoute, notFound } from '@tanstack/react-router';
import type { PublicEmbedResponse } from '@xcreener/cloud-core';

const API_URL = process.env.API_URL ?? process.env.VITE_API_URL ?? 'http://localhost:8787';

async function fetchEmbed(token: string): Promise<PublicEmbedResponse> {
  const response = await fetch(`${API_URL}/v1/embeds/${encodeURIComponent(token)}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw notFound();
  }

  if (response.status === 410) {
    throw new EmbedExpiredError();
  }

  if (!response.ok) {
    throw new Error('Failed to load embed');
  }

  return (await response.json()) as PublicEmbedResponse;
}

class EmbedExpiredError extends Error {
  constructor() {
    super('Embed expired');
    this.name = 'EmbedExpiredError';
  }
}

export const Route = createFileRoute('/e/$token')({
  loader: async ({ params }) => fetchEmbed(params.token),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ? `${loaderData.title} — Xcreener` : 'Xcreener embed' },
      { name: 'robots', content: 'noindex' },
      ...(loaderData?.assetUrl
        ? [
            { property: 'og:image', content: loaderData.assetUrl },
            { property: 'og:title', content: loaderData.title ?? 'Xcreener capture' },
          ]
        : []),
    ],
  }),
  component: EmbedViewerPage,
  errorComponent: EmbedErrorPage,
});

function EmbedViewerPage() {
  const embed = Route.useLoaderData();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f0f12] p-2">
      <figure className="m-0 max-w-full">
        {embed.title ? (
          <figcaption className="mb-2 text-center text-sm text-white/70">{embed.title}</figcaption>
        ) : null}
        {embed.mimeType.startsWith('video/') ? (
          <video
            src={embed.assetUrl}
            controls
            className="max-h-[95vh] max-w-full rounded-lg"
            data-testid="embed-viewer-video"
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={embed.assetUrl}
            alt={embed.title ?? 'Xcreener capture'}
            className="max-h-[95vh] max-w-full rounded-lg object-contain"
            data-testid="embed-viewer-image"
          />
        )}
      </figure>
    </main>
  );
}

function EmbedErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-sm text-muted">This embed is unavailable or has expired.</p>
    </main>
  );
}

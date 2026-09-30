import { templateStyleToCustomPresetInput } from '@snapglow/marketplace-core';
import { Button } from '@snapglow/ui';
import { useCallback, useEffect, useState } from 'react';
import { createCustomPreset } from '@/db/presets';
import { fetchMarketplaceTemplate, fetchMarketplaceTemplates } from '../api';

export function MarketplaceSection() {
  const [templates, setTemplates] = useState<
    Awaited<ReturnType<typeof fetchMarketplaceTemplates>>['items']
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installStatus, setInstallStatus] = useState<Record<string, string>>({});

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketplaceTemplates();
      setTemplates(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function handleInstall(slug: string, title: string) {
    setInstallStatus((prev) => ({ ...prev, [slug]: 'installing' }));
    try {
      const template = await fetchMarketplaceTemplate(slug);
      const input = templateStyleToCustomPresetInput(template.style, title);
      const background =
        input.style.background.type === 'image'
          ? ({ type: 'image', source: null } as const)
          : input.style.background;
      await createCustomPreset({
        ...input,
        style: { ...input.style, background },
      });
      setInstallStatus((prev) => ({ ...prev, [slug]: 'installed' }));
    } catch (err) {
      setInstallStatus((prev) => ({
        ...prev,
        [slug]: err instanceof Error ? err.message : 'Install failed',
      }));
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Template marketplace</h2>
        <p className="mt-1 text-sm text-muted">
          Browse community beautification presets and install them as custom presets.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted">Loading templates…</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && templates.length === 0 ? (
        <p className="text-sm text-muted">No templates available yet.</p>
      ) : null}

      <ul className="space-y-3">
        {templates.map((item) => {
          const status = installStatus[item.slug];
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                {item.description ? (
                  <p className="truncate text-sm text-muted">{item.description}</p>
                ) : null}
                {item.tags.length > 0 ? (
                  <p className="mt-1 text-xs text-muted">{item.tags.join(' · ')}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant={status === 'installed' ? 'secondary' : 'primary'}
                size="sm"
                disabled={status === 'installing' || status === 'installed'}
                onClick={() => void handleInstall(item.slug, item.title)}
              >
                {status === 'installed'
                  ? 'Installed'
                  : status === 'installing'
                    ? 'Installing…'
                    : 'Install'}
              </Button>
            </li>
          );
        })}
      </ul>

      <Button type="button" variant="ghost" size="sm" onClick={() => void loadTemplates()}>
        Refresh
      </Button>
    </section>
  );
}

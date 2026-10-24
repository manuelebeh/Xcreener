import { templateStyleToCustomPresetInput } from '@snapglow/marketplace-core';
import { Button } from '@snapglow/ui';
import { useCallback, useEffect, useState } from 'react';
import { createCustomPreset } from '@/db/presets';
import { SettingsGroup, SettingsRow } from '@/shared/components/SettingsGroup';
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
    <SettingsGroup
      title="Template marketplace"
      description="Community beautification presets. Installing one adds it to your custom presets."
      action={
        error ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void loadTemplates()}
          >
            Refresh
          </Button>
        )
      }
    >
      {loading ? <SettingsRow label="Loading templates…" /> : null}
      {error ? (
        <SettingsRow label="Couldn't load templates" hint={error}>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadTemplates()}>
            Retry
          </Button>
        </SettingsRow>
      ) : null}
      {!loading && !error && templates.length === 0 ? (
        <SettingsRow label="No templates available yet" />
      ) : null}

      {templates.map((item) => {
        const status = installStatus[item.slug];
        const failed = status && status !== 'installing' && status !== 'installed';
        return (
          <SettingsRow
            key={item.id}
            label={item.title}
            hint={
              [item.description, item.tags.join(' · ')].filter(Boolean).join(' · ') || undefined
            }
            footer={
              failed ? (
                <p className="text-xs text-destructive" role="alert">
                  {status}
                </p>
              ) : null
            }
          >
            <Button
              type="button"
              variant="secondary"
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
          </SettingsRow>
        );
      })}
    </SettingsGroup>
  );
}

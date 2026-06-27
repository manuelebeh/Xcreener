import { Button, Input, Select, Slider } from '@snapglow/ui';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import { setSetting } from '@/db';
import {
  captureExperimentExposure,
  capturePaywallShown,
  getPaywallExperimentVariant,
} from '@/integrations/posthog/experiments';
import { hasPremiumAccess } from '@/modules/licensing/premiumAccess';
import { SETTING_KEYS, type WatermarkPosition } from '@/shared/types/settings';
import { useSettingsStore } from '../store';

export function WatermarkSection() {
  const watermarkEnabled = useSettingsStore((s) => s.watermarkEnabled);
  const watermarkDisplayName = useSettingsStore((s) => s.watermarkDisplayName);
  const watermarkUrl = useSettingsStore((s) => s.watermarkUrl);
  const watermarkLogoPath = useSettingsStore((s) => s.watermarkLogoPath);
  const watermarkPosition = useSettingsStore((s) => s.watermarkPosition);
  const watermarkOpacity = useSettingsStore((s) => s.watermarkOpacity);
  const setWatermarkEnabled = useSettingsStore((s) => s.setWatermarkEnabled);
  const setWatermarkDisplayName = useSettingsStore((s) => s.setWatermarkDisplayName);
  const setWatermarkUrl = useSettingsStore((s) => s.setWatermarkUrl);
  const setWatermarkLogoPath = useSettingsStore((s) => s.setWatermarkLogoPath);
  const setWatermarkPosition = useSettingsStore((s) => s.setWatermarkPosition);
  const setWatermarkOpacity = useSettingsStore((s) => s.setWatermarkOpacity);
  const [paywallMessage, setPaywallMessage] = useState<string | null>(null);

  useEffect(() => {
    const variant = getPaywallExperimentVariant();
    captureExperimentExposure('paywall-timing-v1', variant);
  }, []);

  async function handleLogoPick() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    setWatermarkLogoPath(selected);
    await setSetting(SETTING_KEYS.watermarkLogoPath, selected);
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Export watermark</p>
      <p className="mt-1 text-xs text-muted">
        Applied on export, share links, and integration uploads. Free plans keep the watermark on
        exports.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={watermarkEnabled}
          onChange={async (event) => {
            const next = event.target.checked;
            if (
              !next &&
              !hasPremiumAccess() &&
              getPaywallExperimentVariant() === 'watermark_gate'
            ) {
              capturePaywallShown('watermark_disable');
              setPaywallMessage(
                'Removing the watermark requires Team Starter or Pro. Open Settings → Team → Billing.'
              );
              return;
            }
            setPaywallMessage(null);
            setWatermarkEnabled(next);
            await setSetting(SETTING_KEYS.watermarkEnabled, String(next));
          }}
          className="sg-focus-ring size-4 rounded border-border"
          data-testid="watermark-enabled-toggle"
        />
        Show watermark on exports
      </label>

      {paywallMessage ? (
        <p className="mt-2 text-xs text-muted" role="status">
          {paywallMessage}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="watermark-name" className="block text-sm font-medium">
            Display name
            <Input
              id="watermark-name"
              value={watermarkDisplayName}
              onChange={async (event) => {
                setWatermarkDisplayName(event.target.value);
                await setSetting(SETTING_KEYS.watermarkDisplayName, event.target.value);
              }}
              className="mt-2"
            />
          </label>
        </div>

        <div>
          <label htmlFor="watermark-url" className="block text-sm font-medium">
            URL (optional)
            <Input
              id="watermark-url"
              value={watermarkUrl}
              onChange={async (event) => {
                setWatermarkUrl(event.target.value);
                await setSetting(SETTING_KEYS.watermarkUrl, event.target.value);
              }}
              className="mt-2"
              placeholder="https://snapglow.app"
            />
          </label>
        </div>

        <div>
          <label htmlFor="watermark-position" className="block text-sm font-medium">
            Position
            <Select
              id="watermark-position"
              value={watermarkPosition}
              onChange={async (event) => {
                const value = event.target.value as WatermarkPosition;
                setWatermarkPosition(value);
                await setSetting(SETTING_KEYS.watermarkPosition, value);
              }}
              className="mt-2"
            >
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
            </Select>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium">Opacity ({watermarkOpacity}%)</label>
          <Slider
            min={10}
            max={100}
            step={1}
            value={[watermarkOpacity]}
            onValueChange={async (value) => {
              const next = value[0] ?? watermarkOpacity;
              setWatermarkOpacity(next);
              await setSetting(SETTING_KEYS.watermarkOpacity, String(next));
            }}
            className="mt-2"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleLogoPick()}>
            Choose logo
          </Button>
          {watermarkLogoPath ? (
            <span className="truncate text-xs text-muted">{watermarkLogoPath}</span>
          ) : (
            <span className="text-xs text-muted">No logo selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

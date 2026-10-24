import { Button, Input, Select, Slider } from '@snapglow/ui';
import { open } from '@tauri-apps/plugin-dialog';
import { setSetting } from '@/db';
import { usePremiumAccess } from '@/modules/licensing/premiumAccess';
import { SettingsGroup, SettingsRow, SettingsToggle } from '@/shared/components/SettingsGroup';
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
  // Free plans export the SnapGlow badge whatever is saved here (watermarkFromSettings);
  // the controls are locked so the UI says the same thing.
  const premium = usePremiumAccess();
  const locked = !premium;

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
    <SettingsGroup
      title="Export watermark"
      description="Applied on exports, share links, and integration uploads."
    >
      <SettingsToggle
        id="watermark-enabled"
        label="Show watermark on exports"
        hint={
          locked
            ? 'Free plans always show the SnapGlow watermark; you can pick its corner. Team Starter or Pro unlocks removal and customization (Team → Billing).'
            : undefined
        }
        checked={locked || watermarkEnabled}
        disabled={locked}
        onChange={async (next) => {
          setWatermarkEnabled(next);
          await setSetting(SETTING_KEYS.watermarkEnabled, String(next));
        }}
        testId="watermark-enabled-toggle"
      />

      <SettingsRow label="Display name" htmlFor="watermark-name">
        <div className="w-60">
          <Input
            id="watermark-name"
            value={watermarkDisplayName}
            disabled={locked}
            onChange={async (event) => {
              setWatermarkDisplayName(event.target.value);
              await setSetting(SETTING_KEYS.watermarkDisplayName, event.target.value);
            }}
          />
        </div>
      </SettingsRow>

      <SettingsRow label="URL" hint="Optional" htmlFor="watermark-url">
        <div className="w-60">
          <Input
            id="watermark-url"
            value={watermarkUrl}
            disabled={locked}
            onChange={async (event) => {
              setWatermarkUrl(event.target.value);
              await setSetting(SETTING_KEYS.watermarkUrl, event.target.value);
            }}
            placeholder="https://snapglow.app"
          />
        </div>
      </SettingsRow>

      <SettingsRow label="Position" htmlFor="watermark-position">
        <div className="w-60">
          <Select
            id="watermark-position"
            value={watermarkPosition}
            onChange={async (event) => {
              const value = event.target.value as WatermarkPosition;
              setWatermarkPosition(value);
              await setSetting(SETTING_KEYS.watermarkPosition, value);
            }}
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </Select>
        </div>
      </SettingsRow>

      <SettingsRow label="Opacity">
        <div className="flex w-60 items-center gap-3">
          <Slider
            min={10}
            max={100}
            step={1}
            value={[watermarkOpacity]}
            disabled={locked}
            onValueChange={async (value) => {
              const next = value[0] ?? watermarkOpacity;
              setWatermarkOpacity(next);
              await setSetting(SETTING_KEYS.watermarkOpacity, String(next));
            }}
          />
          <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
            {watermarkOpacity}%
          </span>
        </div>
      </SettingsRow>

      <SettingsRow label="Logo" hint={watermarkLogoPath || 'No logo selected'}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={locked}
          onClick={() => void handleLogoPick()}
        >
          Choose logo
        </Button>
      </SettingsRow>
    </SettingsGroup>
  );
}

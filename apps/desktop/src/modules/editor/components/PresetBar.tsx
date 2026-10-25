import { Dropdown, Tooltip, TooltipProvider } from '@xcreener/ui';
import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  FREE_PRESET_ID,
  getNetworkPresets,
  getPresetLabel,
  SOCIAL_NETWORKS,
  SOCIAL_PRESETS,
  STANDARD_PRESETS,
} from '../engine/presets';
import { useEditorStore } from '../store';
import type { FramePreset } from '../types';
import { PresetPicker } from './PresetPicker';
import { SocialIcon } from './SocialIcons';

function formatSize(preset: FramePreset) {
  return `${preset.width}×${preset.height}`;
}

function BarButton({
  isActive,
  className,
  ...props
}: { isActive: boolean } & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      className={clsx(
        'sg-focus-ring flex h-8 min-w-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium tabular-nums transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]',
        className
      )}
      {...props}
    />
  );
}

function PresetButton({
  preset,
  label,
  isActive,
  onSelect,
  icon,
}: {
  preset: FramePreset;
  label?: string;
  isActive: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}) {
  const name = label ?? preset.name;
  const tooltip = preset.width > 0 ? `${name} · ${formatSize(preset)}` : name;

  return (
    <Tooltip content={tooltip}>
      <BarButton aria-label={name} aria-pressed={isActive} isActive={isActive} onClick={onSelect}>
        {icon ?? name}
      </BarButton>
    </Tooltip>
  );
}

function NetworkButton({
  network,
  selectedPresetId,
  onSelect,
}: {
  network: (typeof SOCIAL_NETWORKS)[number];
  selectedPresetId: string | null;
  onSelect: (presetId: string) => void;
}) {
  const variants = getNetworkPresets(network.id);
  const isActive = variants.some((preset) => preset.id === selectedPresetId);
  const icon = <SocialIcon network={network.id} />;

  const [preset] = variants;
  if (!preset) {
    return null;
  }

  if (variants.length === 1) {
    return (
      <PresetButton
        preset={preset}
        label={`${network.name} ${preset.name}`}
        isActive={isActive}
        onSelect={() => onSelect(preset.id)}
        icon={icon}
      />
    );
  }

  return (
    <Dropdown
      modal={false}
      trigger={
        <BarButton aria-label={`${network.name} formats`} isActive={isActive}>
          {icon}
        </BarButton>
      }
      items={variants.map((preset) => ({
        label: preset.name,
        value: preset.id,
        hint: formatSize(preset),
      }))}
      onSelect={onSelect}
    />
  );
}

export function PresetBar({ embedded = false }: { embedded?: boolean }) {
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const setPreset = useEditorStore((s) => s.setPreset);

  const standardWithoutFree = STANDARD_PRESETS.filter((p) => p.id !== FREE_PRESET_ID);
  const freePreset = STANDARD_PRESETS.find((p) => p.id === FREE_PRESET_ID);
  const isFree = selectedPresetId === null;
  const selectedSocial = SOCIAL_PRESETS.find((p) => p.id === selectedPresetId);

  const content = (
    <div className="flex w-full flex-wrap items-center gap-1.5" data-testid="preset-bar">
      {!embedded ? <span className="mr-1 text-xs font-medium text-muted">Format</span> : null}

      {SOCIAL_NETWORKS.map((network) => (
        <NetworkButton
          key={network.id}
          network={network}
          selectedPresetId={selectedPresetId}
          onSelect={setPreset}
        />
      ))}

      <div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

      {standardWithoutFree.map((preset) => (
        <PresetButton
          key={preset.id}
          preset={preset}
          isActive={selectedPresetId === preset.id}
          onSelect={() => setPreset(preset.id)}
        />
      ))}

      {freePreset ? (
        <PresetButton
          preset={freePreset}
          isActive={isFree}
          onSelect={() => setPreset(FREE_PRESET_ID)}
        />
      ) : null}

      {selectedSocial ? (
        <span className="w-full text-xs text-muted tabular-nums">
          {getPresetLabel(selectedSocial)} · {formatSize(selectedSocial)}
        </span>
      ) : null}

      <div className="mt-1 w-full">
        <PresetPicker />
      </div>
    </div>
  );

  if (embedded) {
    return <TooltipProvider>{content}</TooltipProvider>;
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border bg-surface px-3 py-2">{content}</div>
    </TooltipProvider>
  );
}

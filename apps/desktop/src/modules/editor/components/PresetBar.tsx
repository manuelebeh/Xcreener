import { Tooltip, TooltipProvider } from '@snapglow/ui';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { FREE_PRESET_ID, SOCIAL_PRESETS, STANDARD_PRESETS } from '../engine/presets';
import { useEditorStore } from '../store';
import type { FramePreset } from '../types';
import { PresetPicker } from './PresetPicker';
import { SocialIcon } from './SocialIcons';

function PresetButton({
  preset,
  isActive,
  onSelect,
  icon,
}: {
  preset: FramePreset;
  isActive: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}) {
  const displayLabel = icon ?? preset.name;
  const tooltip =
    preset.width > 0 ? `${preset.name} · ${preset.width}×${preset.height}` : preset.name;

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        aria-label={preset.name}
        aria-pressed={isActive}
        className={clsx(
          'sg-focus-ring flex h-8 min-w-8 items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium tabular-nums transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]'
        )}
        onClick={onSelect}
      >
        {displayLabel}
      </button>
    </Tooltip>
  );
}

export function PresetBar({ embedded = false }: { embedded?: boolean }) {
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const setPreset = useEditorStore((s) => s.setPreset);

  const standardWithoutFree = STANDARD_PRESETS.filter((p) => p.id !== FREE_PRESET_ID);
  const freePreset = STANDARD_PRESETS.find((p) => p.id === FREE_PRESET_ID);
  const isFree = selectedPresetId === null;

  const content = (
    <div className="flex w-full flex-wrap items-center gap-1.5" data-testid="preset-bar">
      {!embedded ? <span className="mr-1 text-xs font-medium text-muted">Format</span> : null}

      {SOCIAL_PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          preset={preset}
          isActive={selectedPresetId === preset.id}
          onSelect={() => setPreset(preset.id)}
          icon={<SocialIcon presetId={preset.id} />}
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

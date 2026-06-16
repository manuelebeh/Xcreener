import { Tooltip, TooltipProvider } from '@snapglow/ui';
import { clsx } from 'clsx';
import { FREE_PRESET_ID, SOCIAL_PRESETS, STANDARD_PRESETS } from '../engine/presets';
import { useEditorStore } from '../store';
import type { FramePreset } from '../types';
import { PresetPicker } from './PresetPicker';

const SOCIAL_LABELS: Record<string, string> = {
  twitter: 'X',
  linkedin: 'LI',
  facebook: 'FB',
  instagram: 'IG',
  youtube: 'YT',
};

function PresetButton({
  preset,
  isActive,
  onSelect,
  label,
}: {
  preset: FramePreset;
  isActive: boolean;
  onSelect: () => void;
  label?: string;
}) {
  const displayLabel = label ?? preset.name;
  const tooltip =
    preset.width > 0 ? `${preset.name} · ${preset.width}×${preset.height}` : preset.name;

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        aria-label={preset.name}
        aria-pressed={isActive}
        className={clsx(
          'sg-focus-ring flex h-8 min-w-8 items-center justify-center whitespace-nowrap rounded-md border px-2 text-xs font-medium transition-colors',
          isActive
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-surface text-foreground hover:bg-muted/30'
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
    <div className="flex w-full flex-wrap items-center gap-2" data-testid="preset-bar">
      {!embedded ? <span className="mr-1 text-xs font-medium text-muted">Format</span> : null}

      {SOCIAL_PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          preset={preset}
          isActive={selectedPresetId === preset.id}
          onSelect={() => setPreset(preset.id)}
          label={SOCIAL_LABELS[preset.id]}
        />
      ))}

      <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />

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

      <div className="ml-auto">
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

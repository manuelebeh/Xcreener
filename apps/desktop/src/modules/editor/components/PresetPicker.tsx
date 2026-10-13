import { Button, Input, Label, Select } from '@snapglow/ui';
import { useCallback, useState } from 'react';
import {
  createCustomPreset,
  defaultCreateInputFromStyle,
  deleteCustomPreset,
  storedToFramePreset,
} from '@/db/presets';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { getPresetById } from '../engine/presets';
import { useDeferredPresetDelete } from '../hooks/useDeferredPresetDelete';
import { useEditorStore } from '../store';
import type { AspectRatio } from '../types';
import { PresetUndoToast } from './PresetUndoToast';

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; width: number; height: number }[] =
  [
    { value: '16:9', label: '16:9', width: 1920, height: 1080 },
    { value: '4:3', label: '4:3', width: 1600, height: 1200 },
    { value: '1:1', label: '1:1', width: 1080, height: 1080 },
    { value: '1.91:1', label: '1.91:1', width: 1200, height: 630 },
  ];

function parseCustomDbId(id: string): number | null {
  const match = id.match(/^custom-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function PresetPicker() {
  const customPresets = useEditorStore((s) => s.customPresets);
  const background = useEditorStore((s) => s.background);
  const padding = useEditorStore((s) => s.padding);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const addCustomPreset = useEditorStore((s) => s.addCustomPreset);
  const removeCustomPreset = useEditorStore((s) => s.removeCustomPreset);
  const applyCustomPresetStyle = useEditorStore((s) => s.applyCustomPresetStyle);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [saving, setSaving] = useState(false);

  const flushPresetDelete = useCallback(async (id: string) => {
    const dbId = parseCustomDbId(id);
    if (dbId !== null && isTauriRuntime()) {
      try {
        await deleteCustomPreset(dbId);
      } catch (error) {
        console.error('[SnapGlow] Failed to delete custom preset', error);
      }
    }
  }, []);

  const { requestDelete, undoDelete, pendingPreset } = useDeferredPresetDelete({
    onRemove: removeCustomPreset,
    onRestore: addCustomPreset,
    onFlush: (preset) => flushPresetDelete(preset.id),
  });

  const handleSave = async () => {
    if (!name.trim() || !isTauriRuntime()) {
      return;
    }

    if (background.type === 'image') {
      return;
    }

    setSaving(true);
    try {
      const ratioOption = ASPECT_RATIO_OPTIONS.find((o) => o.value === aspectRatio);
      if (!ratioOption) {
        return;
      }
      const currentFrame = getPresetById(selectedPresetId, customPresets);
      const width =
        currentFrame?.width && currentFrame.width > 0 ? currentFrame.width : ratioOption.width;
      const height =
        currentFrame?.height && currentFrame.height > 0 ? currentFrame.height : ratioOption.height;

      const stored = await createCustomPreset(
        defaultCreateInputFromStyle(name.trim(), aspectRatio, width, height, {
          background,
          padding,
          borderRadius,
          shadow,
        })
      );

      addCustomPreset(storedToFramePreset(stored));
      setName('');
      setOpen(false);
    } catch (error) {
      console.error('[SnapGlow] Failed to save custom preset', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        className="h-7 w-full text-xs whitespace-nowrap"
        onClick={() => setOpen((value) => !value)}
      >
        Presets
      </Button>

      {open ? (
        <div className="absolute right-0 left-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Save current style</Label>
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Preset name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}
                >
                  {ASPECT_RATIO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                {background.type === 'image' ? (
                  <p className="text-xs text-muted">
                    Image backgrounds cannot be saved in presets.
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!name.trim() || saving || background.type === 'image'}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : 'Save preset'}
                </Button>
              </div>
            </div>

            {customPresets.length > 0 ? (
              <div>
                <Label className="text-xs">Custom presets</Label>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {customPresets.map((preset) => (
                    <li
                      key={preset.id}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/20"
                    >
                      <button
                        type="button"
                        className="sg-focus-ring flex-1 truncate rounded-sm text-left text-sm"
                        onClick={() => {
                          applyCustomPresetStyle(preset);
                          setOpen(false);
                        }}
                      >
                        {preset.name}
                      </button>
                      <button
                        type="button"
                        className="sg-focus-ring rounded-sm px-1 text-xs text-muted hover:text-destructive"
                        aria-label={`Delete ${preset.name}`}
                        onClick={() => requestDelete(preset)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <PresetUndoToast preset={pendingPreset} onUndo={undoDelete} />
    </div>
  );
}

import { Label, Slider } from '@snapglow/ui';
import { useEffect, useRef, useState } from 'react';
import { GRADIENT_PRESETS } from '../engine/gradients';
import { useEditorStore } from '../store';
import type { BackgroundConfig } from '../types';

type BackgroundTab = BackgroundConfig['type'];

function backgroundTabFromConfig(background: BackgroundConfig): BackgroundTab {
  return background.type;
}

export function BeautifyPanel() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const background = useEditorStore((s) => s.background);
  const padding = useEditorStore((s) => s.padding);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const setPadding = useEditorStore((s) => s.setPadding);
  const updateBackground = useEditorStore((s) => s.updateBackground);
  const setBorderRadius = useEditorStore((s) => s.setBorderRadius);
  const updateShadow = useEditorStore((s) => s.updateShadow);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<BackgroundTab>(() =>
    backgroundTabFromConfig(background)
  );

  useEffect(() => {
    setActiveTab(backgroundTabFromConfig(background));
  }, [background]);

  if (!screenshot) {
    return null;
  }

  const solidColor = background.type === 'solid' ? background.color : '#667eea';
  const imageSource = background.type === 'image' ? background.source : null;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      setActiveTab('image');
      updateBackground({ type: 'image', source: bitmap });
    } catch {
      // Ignore invalid image files.
    }
  };

  const openImagePicker = () => {
    setActiveTab('image');
    fileInputRef.current?.click();
  };

  return (
    <aside className="w-full max-w-xs shrink-0 space-y-5 rounded-xl border border-border bg-surface p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div>
        <h2 className="text-sm font-semibold text-foreground">Beautify</h2>
        <p className="mt-0.5 text-xs text-muted">Adjust background, padding, and shadow</p>
      </div>

      <div className="space-y-2">
        <Label>Background</Label>
        <div className="flex gap-1">
          {(['gradient', 'solid', 'image'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted hover:text-foreground'
              }`}
              onClick={() => {
                if (tab === 'gradient') {
                  setActiveTab('gradient');
                  updateBackground({ type: 'gradient', presetId: 'snapglow-brand' });
                } else if (tab === 'solid') {
                  setActiveTab('solid');
                  updateBackground({ type: 'solid', color: solidColor });
                } else {
                  openImagePicker();
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'gradient' && (
          <div className="grid max-h-40 grid-cols-5 gap-1.5 overflow-y-auto pr-1">
            {GRADIENT_PRESETS.map((preset) => {
              const isSelected =
                background.type === 'gradient' && background.presetId === preset.id;
              const gradientCss = `linear-gradient(${preset.angle}deg, ${preset.stops
                .map((stop) => `${stop.color} ${stop.offset * 100}%`)
                .join(', ')})`;

              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.name}
                  aria-label={preset.name}
                  className={`aspect-square rounded-md border-2 ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ background: gradientCss }}
                  onClick={() => updateBackground({ type: 'gradient', presetId: preset.id })}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'solid' && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={solidColor}
              onChange={(event) => updateBackground({ type: 'solid', color: event.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <span className="text-xs text-muted">{solidColor}</span>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-2">
            <button
              type="button"
              className="w-full rounded-md border border-border px-3 py-2 text-xs hover:bg-muted/20"
              onClick={openImagePicker}
            >
              {imageSource ? 'Change background image' : 'Upload background image'}
            </button>
            {imageSource ? (
              <p className="text-xs text-muted">
                {imageSource.width}×{imageSource.height}px background applied
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Padding ({padding}px)</Label>
        <Slider
          value={[padding]}
          min={0}
          max={200}
          step={1}
          onValueChange={([value]) => {
            if (value !== undefined) {
              setPadding(value);
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Corner radius ({borderRadius}px)</Label>
        <Slider
          value={[borderRadius]}
          min={0}
          max={32}
          step={1}
          onValueChange={([value]) => {
            if (value !== undefined) {
              setBorderRadius(value);
            }
          }}
        />
      </div>

      <div className="space-y-3">
        <Label>Shadow</Label>
        <div className="space-y-2">
          <Label className="text-xs text-muted">Blur ({shadow.blur}px)</Label>
          <Slider
            value={[shadow.blur]}
            min={0}
            max={64}
            step={1}
            onValueChange={([value]) => {
              if (value !== undefined) {
                updateShadow({ blur: value });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted">Offset Y ({shadow.offsetY}px)</Label>
          <Slider
            value={[shadow.offsetY]}
            min={0}
            max={48}
            step={1}
            onValueChange={([value]) => {
              if (value !== undefined) {
                updateShadow({ offsetY: value });
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted">
            Opacity ({Math.round(shadow.opacity * 100)}%)
          </Label>
          <Slider
            value={[Math.round(shadow.opacity * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => {
              if (value !== undefined) {
                updateShadow({ opacity: value / 100 });
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="shadow-color" className="text-xs text-muted">
            Color
          </Label>
          <input
            id="shadow-color"
            type="color"
            value={shadow.color}
            onChange={(event) => updateShadow({ color: event.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
          />
        </div>
      </div>
    </aside>
  );
}

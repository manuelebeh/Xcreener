import { Label, Slider } from '@snapglow/ui';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SOLID_COLOR, GRADIENT_PRESETS } from '../engine/gradients';
import { useEditorStore } from '../store';
import type { BackgroundConfig } from '../types';

type BackgroundTab = BackgroundConfig['type'];

function backgroundTabFromConfig(background: BackgroundConfig): BackgroundTab {
  return background.type;
}

export function StyleBar({ embedded = false }: { embedded?: boolean }) {
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

  const solidColor = background.type === 'solid' ? background.color : DEFAULT_SOLID_COLOR;
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

  const content = (
    <div className="w-full space-y-4" data-testid="style-bar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label>Background</Label>
          <div className="flex gap-1">
            {(['gradient', 'solid', 'image'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`sg-focus-ring rounded-md px-2.5 py-1 text-xs capitalize whitespace-nowrap ${
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

          {activeTab === 'gradient' ? (
            <div className="grid max-h-24 grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1.5 overflow-y-auto pr-1">
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
                    className={`h-8 w-8 shrink-0 rounded-md border-2 ${
                      isSelected ? 'border-primary' : 'border-transparent'
                    }`}
                    style={{ background: gradientCss }}
                    onClick={() => updateBackground({ type: 'gradient', presetId: preset.id })}
                  />
                );
              })}
            </div>
          ) : null}

          {activeTab === 'solid' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={solidColor}
                onChange={(event) => updateBackground({ type: 'solid', color: event.target.value })}
                className="sg-focus-ring h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
              />
              <span className="text-xs text-muted">{solidColor}</span>
            </div>
          ) : null}

          {activeTab === 'image' ? (
            <div className="space-y-1">
              <button
                type="button"
                className="sg-focus-ring rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/20"
                onClick={openImagePicker}
              >
                {imageSource ? 'Change image' : 'Upload image'}
              </button>
              {imageSource ? (
                <p className="text-xs text-muted">
                  {imageSource.width}×{imageSource.height}px
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="w-full min-w-[140px] max-w-[180px] space-y-2 sm:w-auto">
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

        <div className="w-full min-w-[140px] max-w-[180px] space-y-2 sm:w-auto">
          <Label>Radius ({borderRadius}px)</Label>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted">Shadow blur ({shadow.blur}px)</Label>
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
          <Label className="text-xs text-muted">Offset X ({shadow.offsetX}px)</Label>
          <Slider
            value={[shadow.offsetX]}
            min={-32}
            max={32}
            step={1}
            onValueChange={([value]) => {
              if (value !== undefined) {
                updateShadow({ offsetX: value });
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
          <div className="flex items-center gap-2 pt-1">
            <Label htmlFor="stylebar-shadow-color" className="text-xs text-muted">
              Color
            </Label>
            <input
              id="stylebar-shadow-color"
              type="color"
              value={shadow.color}
              onChange={(event) => updateShadow({ color: event.target.value })}
              className="sg-focus-ring h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}

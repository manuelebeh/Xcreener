import { useEffect, useRef, useState } from 'react';
import { Segmented } from '@/shared/components/Segmented';
import { SliderField } from '@/shared/components/SliderField';
import { DEFAULT_SOLID_COLOR, GRADIENT_PRESETS } from '../engine/gradients';
import { useEditorStore } from '../store';
import type { BackgroundConfig } from '../types';

type BackgroundTab = BackgroundConfig['type'];

/** Swatches shown before "Show all", two rows of the 8-column grid. */
const GRADIENT_PREVIEW_COUNT = 16;

const BACKGROUND_TABS = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid' },
  { value: 'image', label: 'Image' },
] as const;

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
  const [showAllGradients, setShowAllGradients] = useState(false);
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

  const selectedGradientIndex =
    background.type === 'gradient'
      ? GRADIENT_PRESETS.findIndex((preset) => preset.id === background.presetId)
      : -1;
  const expandGradients = showAllGradients || selectedGradientIndex >= GRADIENT_PREVIEW_COUNT;
  const visibleGradients = expandGradients
    ? GRADIENT_PRESETS
    : GRADIENT_PRESETS.slice(0, GRADIENT_PREVIEW_COUNT);

  const content = (
    <div className="w-full space-y-5" data-testid="style-bar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="space-y-2">
        <span className="text-xs text-foreground">Background</span>
        <Segmented
          ariaLabel="Background type"
          value={activeTab}
          options={BACKGROUND_TABS}
          onChange={(tab) => {
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
        />

        {activeTab === 'gradient' ? (
          <div className="grid grid-cols-8 gap-1.5 pt-1">
            {visibleGradients.map((preset) => {
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
                  aria-pressed={isSelected}
                  className={`sg-focus-ring aspect-square rounded-md ring-1 ring-black/10 ring-inset ${
                    isSelected ? 'outline-2 outline-offset-1 outline-primary' : ''
                  }`}
                  style={{ background: gradientCss }}
                  onClick={() => updateBackground({ type: 'gradient', presetId: preset.id })}
                />
              );
            })}
            {GRADIENT_PRESETS.length > GRADIENT_PREVIEW_COUNT &&
            selectedGradientIndex < GRADIENT_PREVIEW_COUNT ? (
              <button
                type="button"
                aria-expanded={showAllGradients}
                className="sg-focus-ring col-span-8 mt-0.5 h-6 rounded-md text-xs text-muted hover:text-foreground"
                onClick={() => setShowAllGradients((value) => !value)}
              >
                {showAllGradients ? 'Show fewer' : `Show all ${GRADIENT_PRESETS.length}`}
              </button>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'solid' ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="color"
              aria-label="Background color"
              value={solidColor}
              onChange={(event) => updateBackground({ type: 'solid', color: event.target.value })}
              className="sg-focus-ring h-7 w-10 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <span className="text-xs text-muted tabular-nums">{solidColor}</span>
          </div>
        ) : null}

        {activeTab === 'image' ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="sg-focus-ring h-7 rounded-md border border-border bg-surface px-3 text-xs hover:bg-foreground/[0.05]"
              onClick={openImagePicker}
            >
              {imageSource ? 'Change image' : 'Upload image'}
            </button>
            {imageSource ? (
              <span className="text-xs text-muted tabular-nums">
                {imageSource.width}×{imageSource.height}px
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <SliderField
          label="Padding"
          readout={`${padding}px`}
          value={padding}
          min={0}
          max={200}
          onChange={setPadding}
        />
        <SliderField
          label="Corner radius"
          readout={`${borderRadius}px`}
          value={borderRadius}
          min={0}
          max={32}
          onChange={setBorderRadius}
        />
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">Shadow</span>
          <div className="flex items-center gap-2">
            <label htmlFor="stylebar-shadow-color" className="text-xs text-muted">
              Color
            </label>
            <input
              id="stylebar-shadow-color"
              type="color"
              value={shadow.color}
              onChange={(event) => updateShadow({ color: event.target.value })}
              className="sg-focus-ring h-6 w-9 cursor-pointer rounded-md border border-border bg-transparent"
            />
          </div>
        </div>
        <SliderField
          label="Blur"
          readout={`${shadow.blur}px`}
          value={shadow.blur}
          min={0}
          max={64}
          onChange={(blur) => updateShadow({ blur })}
        />
        <div className="grid grid-cols-2 gap-4">
          <SliderField
            label="Offset X"
            readout={`${shadow.offsetX}px`}
            value={shadow.offsetX}
            min={-32}
            max={32}
            onChange={(offsetX) => updateShadow({ offsetX })}
          />
          <SliderField
            label="Offset Y"
            readout={`${shadow.offsetY}px`}
            value={shadow.offsetY}
            min={0}
            max={48}
            onChange={(offsetY) => updateShadow({ offsetY })}
          />
        </div>
        <SliderField
          label="Opacity"
          readout={`${Math.round(shadow.opacity * 100)}%`}
          value={Math.round(shadow.opacity * 100)}
          min={0}
          max={100}
          onChange={(opacity) => updateShadow({ opacity: opacity / 100 })}
        />
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}

import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { lineId, mapLineToLayout } from '@snapglow/ocr-core';
import { useTextExtraction } from '../hooks/useTextExtraction';
import { useTextExtractionStore } from '../store';

interface TextSelectionOverlayProps {
  displayScale: number;
}

export function TextSelectionOverlay({ displayScale }: TextSelectionOverlayProps) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const padding = useEditorStore((s) => s.padding);
  const background = useEditorStore((s) => s.background);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const transform = useEditorStore((s) => s.transform);
  const customPresets = useEditorStore((s) => s.customPresets);
  const annotations = useEditorStore((s) => s.annotations);
  const lines = useTextExtractionStore((s) => s.lines);
  const selectedLineIds = useTextExtractionStore((s) => s.selectedLineIds);
  const selectionEnabled = useTextExtractionStore((s) => s.selectionEnabled);
  const { toggleLine } = useTextExtraction();

  if (!screenshot || !selectionEnabled || lines.length === 0) {
    return null;
  }

  const frame = getPresetById(selectedPresetId, customPresets);
  const input = {
    screenshot,
    background,
    padding,
    borderRadius,
    shadow,
    frame,
    transform,
    annotations,
    selectedAnnotationId: null,
  };
  const layout = computeLayout(input);

  return (
    <div className="pointer-events-none absolute inset-0" data-testid="text-selection-overlay">
      {lines.map((line) => {
        const id = lineId(line);
        const rect = mapLineToLayout(line, layout, screenshot.width, screenshot.height);
        const selected = selectedLineIds.includes(id);

        return (
          <button
            key={id}
            type="button"
            className="pointer-events-auto absolute rounded-sm border border-primary/70 bg-primary/10"
            style={{
              left: rect.x * displayScale,
              top: rect.y * displayScale,
              width: rect.width * displayScale,
              height: rect.height * displayScale,
              outline: selected ? '2px solid var(--color-primary)' : undefined,
            }}
            title={line.text}
            onClick={(event) => toggleLine(id, event.shiftKey)}
            data-testid="text-selection-hit"
          />
        );
      })}
      <span className="sr-only">
        {layout.canvasWidth}x{layout.canvasHeight}
      </span>
    </div>
  );
}

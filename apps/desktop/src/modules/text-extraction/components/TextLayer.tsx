import { mapLineToLayout } from '@snapglow/ocr-core';
import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { useTextExtractionStore } from '../store';

const FONT_FAMILY = 'system-ui, -apple-system, sans-serif';
/** Glyph size relative to the OCR line box, so the selection highlight fills the box. */
const FONT_RATIO = 0.8;

let measureContext: CanvasRenderingContext2D | null = null;

function measureText(text: string, fontSize: number): number {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) {
    return 0;
  }
  measureContext.font = `${fontSize}px ${FONT_FAMILY}`;
  return measureContext.measureText(text).width;
}

interface TextLayerProps {
  displayScale: number;
}

/**
 * Invisible text laid over the OCR lines, like Live Text: drag to select, then
 * copy with ⌘C or the native context menu (Copy, Look Up, Translate).
 */
export function TextLayer({ displayScale }: TextLayerProps) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const padding = useEditorStore((s) => s.padding);
  const background = useEditorStore((s) => s.background);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const transform = useEditorStore((s) => s.transform);
  const customPresets = useEditorStore((s) => s.customPresets);
  const activeTool = useEditorStore((s) => s.activeTool);
  const lines = useTextExtractionStore((s) => s.lines);

  if (!screenshot || activeTool !== 'select' || lines.length === 0) {
    return null;
  }

  const layout = computeLayout({
    screenshot,
    background,
    padding,
    borderRadius,
    shadow,
    frame: getPresetById(selectedPresetId, customPresets),
    transform,
    annotations: [],
    selectedAnnotationId: null,
  });

  return (
    <div
      className="pointer-events-none absolute inset-0 select-text"
      data-testid="text-layer"
      onCopy={(event) => {
        // Plain text only: the spans are transparent, so rich paste would be invisible.
        const text = window.getSelection()?.toString() ?? '';
        if (text) {
          event.clipboardData.setData('text/plain', text);
          event.preventDefault();
        }
      }}
    >
      {lines.map((line) => {
        const rect = mapLineToLayout(line, layout, screenshot.width, screenshot.height);
        const height = rect.height * displayScale;
        const fontSize = height * FONT_RATIO;
        const naturalWidth = measureText(line.text, fontSize);
        const scaleX = naturalWidth > 0 ? (rect.width * displayScale) / naturalWidth : 1;

        return (
          <div
            key={`${line.x}:${line.y}:${line.text}`}
            className="pointer-events-auto absolute cursor-text whitespace-pre text-transparent selection:bg-primary/35"
            style={{
              left: rect.x * displayScale,
              top: rect.y * displayScale,
              height,
              fontFamily: FONT_FAMILY,
              fontSize,
              lineHeight: `${height}px`,
              transform: `scaleX(${scaleX})`,
              transformOrigin: 'left top',
            }}
            data-testid="text-layer-line"
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

import { computeLayout } from '@/modules/editor/engine/computeLayout';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { useRedactionScan } from '../hooks/useRedactionScan';
import { useRedactionStore } from '../store';
import { detectionColor } from '../types';
import { mapRegionToLayout } from '../utils/mapToLayout';

interface RedactionOverlayProps {
  displayScale: number;
}

export function RedactionOverlay({ displayScale }: RedactionOverlayProps) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const padding = useEditorStore((s) => s.padding);
  const background = useEditorStore((s) => s.background);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const transform = useEditorStore((s) => s.transform);
  const customPresets = useEditorStore((s) => s.customPresets);
  const annotations = useEditorStore((s) => s.annotations);
  const detections = useRedactionStore((s) => s.detections);
  const { maskOne } = useRedactionScan();

  if (!screenshot || detections.length === 0) {
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
    <div className="pointer-events-none absolute inset-0" data-testid="redaction-overlay">
      {detections.map((detection) => {
        const rect = mapRegionToLayout(detection, input);
        return (
          <button
            key={detection.id}
            type="button"
            className="sg-focus-ring pointer-events-auto absolute border border-white/70"
            style={{
              left: rect.x * displayScale,
              top: rect.y * displayScale,
              width: rect.width * displayScale,
              height: rect.height * displayScale,
              backgroundColor: detectionColor(detection.kind),
            }}
            title={`Mask ${detection.kind}`}
            aria-label={`Mask ${detection.kind}`}
            onClick={() => maskOne(detection.id)}
            data-testid={`redaction-hit-${detection.kind}`}
          />
        );
      })}
      <span className="sr-only">
        {layout.canvasWidth}x{layout.canvasHeight}
      </span>
    </div>
  );
}

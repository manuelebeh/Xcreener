import { useEffect, useMemo, useRef, useState } from 'react';
import { computeLayout } from '../engine/computeLayout';
import { fitPreviewSize } from '../engine/fitPreviewSize';
import { getPresetById } from '../engine/presets';
import { useBeautifyRender } from '../hooks/useBeautifyRender';
import { useScreenshotTransform } from '../hooks/useScreenshotTransform';
import { useEditorStore } from '../store';
import type { RenderInput } from '../types';

const PREVIEW_MAX_HEIGHT = 'min(62vh, 560px)';

export function Canvas() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const padding = useEditorStore((s) => s.padding);
  const background = useEditorStore((s) => s.background);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const transform = useEditorStore((s) => s.transform);
  const customPresets = useEditorStore((s) => s.customPresets);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const frame = useMemo(
    () => (screenshot ? getPresetById(selectedPresetId, customPresets) : null),
    [screenshot, selectedPresetId, customPresets]
  );

  const renderInput = useMemo<RenderInput | null>(() => {
    if (!screenshot) {
      return null;
    }

    return {
      screenshot,
      background,
      padding,
      borderRadius,
      shadow,
      frame,
      transform,
    };
  }, [screenshot, background, padding, borderRadius, shadow, frame, transform]);

  const layout = useMemo(() => (renderInput ? computeLayout(renderInput) : null), [renderInput]);

  const displaySize = useMemo(() => {
    if (!layout || containerSize.width <= 0 || containerSize.height <= 0) {
      return { width: 0, height: 0 };
    }

    return fitPreviewSize(
      layout.canvasWidth,
      layout.canvasHeight,
      containerSize.width,
      containerSize.height
    );
  }, [layout, containerSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useBeautifyRender(canvasRef, renderInput);
  useScreenshotTransform(canvasRef);

  const exportLabel = layout
    ? `${layout.canvasWidth} × ${layout.canvasHeight}px · rendu final`
    : null;

  const presetLabel = frame?.name ?? 'Libre';

  return (
    <section className="w-full space-y-2" aria-label="Aperçu export">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium text-foreground">Aperçu export</p>
        {layout ? (
          <p className="text-xs text-muted" data-testid="canvas-export-meta">
            {presetLabel} · {exportLabel}
          </p>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-4"
        style={{ height: PREVIEW_MAX_HEIGHT, minHeight: 220 }}
        data-testid="canvas-preview-stage"
      >
        {screenshot && layout && displaySize.width > 0 ? (
          <div
            className="relative shrink-0 overflow-hidden shadow-md ring-1 ring-border/80"
            style={{
              width: displaySize.width,
              height: displaySize.height,
              aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
            }}
            data-testid="canvas-export-frame"
          >
            <canvas
              ref={canvasRef}
              data-testid="editor-canvas"
              className="block h-full w-full touch-none"
            />
          </div>
        ) : screenshot ? (
          <p className="text-sm text-muted">Preparing preview…</p>
        ) : (
          <p className="text-sm text-muted">Capture a screenshot to start beautifying</p>
        )}
      </div>
    </section>
  );
}

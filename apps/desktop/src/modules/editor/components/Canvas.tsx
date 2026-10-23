import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RemoteCursorsOverlay } from '@/modules/collab/components/RemoteCursorsOverlay';
import { useCollabPointerPresence } from '@/modules/collab/hooks/useCollabSession';
import { useCollabStore } from '@/modules/collab/store';
import { usePremiumAccess } from '@/modules/licensing/premiumAccess';
import { RedactionOverlay } from '@/modules/redaction/components/RedactionOverlay';
import { useSettingsStore } from '@/modules/settings/store';
import { loadWatermarkLogoImage, watermarkFromSettings } from '@/modules/settings/watermark';
import { TextSelectionOverlay } from '@/modules/text-extraction/components/TextSelectionOverlay';
import { computeLayout } from '../engine/computeLayout';
import { fitPreviewSize } from '../engine/fitPreviewSize';
import { getPresetById, getPresetLabel } from '../engine/presets';
import {
  type TextEditRequest,
  useAnnotationInteraction,
  useScreenshotTransformEnabled,
} from '../hooks/useAnnotationInteraction';
import { useBeautifyRender } from '../hooks/useBeautifyRender';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { useEditorStore } from '../store';
import type { RenderInput } from '../types';
import { TextEditorOverlay } from './TextEditorOverlay';

/** Stage padding (p-8) around the preview, subtracted from the measured stage size. */
const STAGE_PADDING = 64;

export function Canvas() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const padding = useEditorStore((s) => s.padding);
  const background = useEditorStore((s) => s.background);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const selectedPresetId = useEditorStore((s) => s.selectedPresetId);
  const transform = useEditorStore((s) => s.transform);
  const customPresets = useEditorStore((s) => s.customPresets);
  const annotations = useEditorStore((s) => s.annotations);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const watermarkSettings = useSettingsStore(
    useShallow((s) => ({
      watermarkEnabled: s.watermarkEnabled,
      watermarkDisplayName: s.watermarkDisplayName,
      watermarkUrl: s.watermarkUrl,
      watermarkLogoPath: s.watermarkLogoPath,
      watermarkPosition: s.watermarkPosition,
      watermarkOpacity: s.watermarkOpacity,
      useTeamBrandKit: s.useTeamBrandKit,
    }))
  );

  const premium = usePremiumAccess();
  const [watermarkLogo, setWatermarkLogo] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const config = watermarkFromSettings(watermarkSettings, premium);
    if (!config.enabled || !config.logoPath) {
      setWatermarkLogo(null);
      return;
    }

    let cancelled = false;
    void loadWatermarkLogoImage(config.logoPath)
      .then((image) => {
        if (!cancelled) {
          setWatermarkLogo(image);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWatermarkLogo(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [watermarkSettings, premium]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [textEditRequest, setTextEditRequest] = useState<TextEditRequest | null>(null);
  const _documentId = useCollabStore((s) => s.documentId);
  const commentMode = useCollabStore((s) => s.commentMode);
  const setPendingAnchor = useCollabStore((s) => s.setPendingAnchor);

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
      annotations,
      selectedAnnotationId,
      watermark: watermarkFromSettings(watermarkSettings, premium),
      watermarkLogo,
    };
  }, [
    screenshot,
    background,
    padding,
    borderRadius,
    shadow,
    frame,
    transform,
    annotations,
    selectedAnnotationId,
    watermarkSettings,
    premium,
    watermarkLogo,
  ]);

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

  const displayScale = useMemo(() => {
    if (!layout || displaySize.width <= 0) {
      return 1;
    }
    return displaySize.width / layout.canvasWidth;
  }, [displaySize.width, layout]);

  useCollabPointerPresence(
    canvasRef,
    layout?.canvasWidth ?? 0,
    layout?.canvasHeight ?? 0,
    displayScale
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!commentMode || !layout) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / displayScale / layout.canvasWidth;
      const y = (event.clientY - rect.top) / displayScale / layout.canvasHeight;
      setPendingAnchor({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
    },
    [commentMode, displayScale, layout, setPendingAnchor]
  );

  const handleTextEdit = useCallback((request: TextEditRequest) => {
    setTextEditRequest(request);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({
        width: Math.max(0, Math.floor(rect.width) - STAGE_PADDING),
        height: Math.max(0, Math.floor(rect.height) - STAGE_PADDING),
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

  const canvasMounted = displaySize.width > 0;

  useBeautifyRender(canvasRef, renderInput, canvasMounted);
  useScreenshotTransformEnabled(canvasRef, canvasMounted && activeTool === 'move');
  useAnnotationInteraction({
    canvasRef,
    layoutWidth: layout?.canvasWidth ?? 0,
    layoutHeight: layout?.canvasHeight ?? 0,
    onTextEdit: handleTextEdit,
    enabled: canvasMounted,
  });
  useEditorShortcuts();

  const exportLabel = layout
    ? `${layout.canvasWidth} × ${layout.canvasHeight}px · final render`
    : null;

  const presetLabel = frame ? getPresetLabel(frame) : 'Free';

  return (
    <section className="flex h-full min-h-0 w-full flex-col" aria-label="Export preview">
      <div
        ref={containerRef}
        className="app-stage flex min-h-0 flex-1 items-center justify-center p-8"
        data-testid="canvas-preview-stage"
      >
        {screenshot && layout && displaySize.width > 0 ? (
          <div
            className="relative shrink-0 overflow-hidden shadow-[0_8px_30px_rgb(0_0_0/0.22)] ring-1 ring-black/10"
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
              onClick={handleCanvasClick}
            />
            <RemoteCursorsOverlay
              layoutWidth={layout.canvasWidth}
              layoutHeight={layout.canvasHeight}
              displayScale={displayScale}
            />
            <TextEditorOverlay
              request={textEditRequest}
              displayScale={displayScale}
              onClose={() => setTextEditRequest(null)}
            />
            <RedactionOverlay displayScale={displayScale} />
            <TextSelectionOverlay displayScale={displayScale} />
          </div>
        ) : screenshot ? (
          <p className="text-sm text-muted">Preparing preview…</p>
        ) : (
          <p className="text-sm text-muted" data-testid="canvas-empty-state">
            Capture a screenshot to start beautifying
          </p>
        )}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3">
        <p className="text-xs text-muted">Export preview</p>
        {layout ? (
          <p className="text-xs text-muted tabular-nums" data-testid="canvas-export-meta">
            {presetLabel} · {exportLabel} · Fit {Math.round(displayScale * 100)}%
          </p>
        ) : null}
      </div>
    </section>
  );
}

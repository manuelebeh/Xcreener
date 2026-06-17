import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCallback, useEffect, useState } from 'react';
import type { CaptureMode, Rect } from '@/shared/types/ipc';
import { cropObjectUrlToPngBytes, getImageDimensionsFromPng } from '@/shared/utils/image';
import { cancelCaptureOverlay, getWindowAtPoint, hideCaptureOverlay } from '@/tauri/commands';
import { captureOverlayCursor } from '../captureCursors';
import { captureToolbarContainerStyle, captureToolbarStyle } from '../captureToolbarPlacement';
import { findMonitorAtPoint } from '../findMonitorAtPoint';
import {
  clientToBounds,
  getOverlayViewport,
  type OverlayViewport,
  viewportRectToBounds,
} from '../overlayCoordinates';
import { useCaptureStore } from '../store';
import { toOverlayRect } from '../toOverlayRect';
import { CaptureToolbar } from './CaptureToolbar';
import { MonitorHighlight } from './MonitorHighlight';
import { RegionSelector } from './RegionSelector';
import { WindowHighlight } from './WindowHighlight';

async function publishCapture(bytes: number[]) {
  const dimensions = getImageDimensionsFromPng(bytes);
  await emit('capture-image', {
    bytes,
    width: dimensions?.width ?? 0,
    height: dimensions?.height ?? 0,
  });
}

async function publishCaptureError(message: string) {
  await emit('capture-error', { message });
}

export function CaptureOverlay() {
  const activeMode = useCaptureStore((s) => s.activeMode);
  const bounds = useCaptureStore((s) => s.bounds);
  const monitors = useCaptureStore((s) => s.monitors);
  const webviewLayout = useCaptureStore((s) => s.webviewLayout);
  const hoveredWindow = useCaptureStore((s) => s.hoveredWindow);
  const hoveredMonitor = useCaptureStore((s) => s.hoveredMonitor);
  const previewUrl = useCaptureStore((s) => s.previewUrl);
  const selection = useCaptureStore((s) => s.selection);
  const error = useCaptureStore((s) => s.error);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setSelection = useCaptureStore((s) => s.setSelection);
  const setHoveredWindow = useCaptureStore((s) => s.setHoveredWindow);
  const setHoveredMonitor = useCaptureStore((s) => s.setHoveredMonitor);
  const setError = useCaptureStore((s) => s.setError);
  const reset = useCaptureStore((s) => s.reset);
  const [revealed, setRevealed] = useState(false);
  const [viewport, setViewport] = useState<OverlayViewport>(() =>
    getOverlayViewport(bounds, monitors, { webviewLayout })
  );

  useEffect(() => {
    setRevealed(false);
  }, [bounds, previewUrl]);

  useEffect(() => {
    if (!webviewLayout) {
      return;
    }

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      setViewport(getOverlayViewport(bounds, monitors, { webviewLayout }));
      innerFrame = requestAnimationFrame(() => setRevealed(true));
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [webviewLayout, bounds, monitors]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport(getOverlayViewport(bounds, monitors, { webviewLayout }));
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    let cancelled = false;
    void getCurrentWebviewWindow()
      .scaleFactor()
      .then((scaleFactor) => {
        if (cancelled || scaleFactor <= 1.01) {
          return;
        }

        setViewport(
          getOverlayViewport(bounds, monitors, {
            webviewLayout: {
              scaleFactor,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
            },
          })
        );
      })
      .catch(() => {
        // Not running inside Tauri — tests and storybook.
      });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', updateViewport);
    };
  }, [bounds, monitors, webviewLayout]);

  const finishCapture = useCallback(
    async (bytes: number[]) => {
      await hideCaptureOverlay();
      await publishCapture(bytes);
      reset();
    },
    [reset]
  );

  const handleCaptureFailure = useCallback(
    async (failure: unknown) => {
      const message = failure instanceof Error ? failure.message : String(failure);
      setError(message);
      await publishCaptureError(message);
    },
    [setError]
  );

  const finishPreviewCrop = useCallback(
    async (rect: Rect) => {
      if (!previewUrl || !bounds) {
        return;
      }

      setError(null);
      try {
        const cropped = await cropObjectUrlToPngBytes(previewUrl, rect, {
          width: viewport.width,
          height: viewport.height,
        });
        await finishCapture(cropped.bytes);
      } catch (failure) {
        await handleCaptureFailure(failure);
      }
    },
    [
      bounds,
      finishCapture,
      handleCaptureFailure,
      previewUrl,
      setError,
      viewport.height,
      viewport.width,
    ]
  );

  const handleCancel = useCallback(async () => {
    await cancelCaptureOverlay();
    reset();
  }, [reset]);

  const handleModeChange = useCallback(
    (mode: CaptureMode) => {
      if (mode === 'idle') {
        return;
      }

      setActiveMode(mode);
      setHoveredWindow(null);
      setHoveredMonitor(null);
      setSelection(null);
      setError(null);
    },
    [setActiveMode, setError, setHoveredMonitor, setHoveredWindow, setSelection]
  );

  const resolveFullscreenMonitor = useCallback(() => {
    if (hoveredMonitor) {
      return hoveredMonitor;
    }

    if (monitors.length === 1) {
      return monitors[0] ?? null;
    }

    return null;
  }, [hoveredMonitor, monitors]);

  const handleRegionConfirm = useCallback(() => {
    if (!selection || !bounds) {
      return;
    }

    void finishPreviewCrop(viewportRectToBounds(selection, bounds, viewport));
  }, [bounds, finishPreviewCrop, selection, viewport]);

  const handleWindowClick = useCallback(() => {
    if (!hoveredWindow || activeMode !== 'window' || !bounds) {
      return;
    }

    void finishPreviewCrop(toOverlayRect(hoveredWindow, bounds));
  }, [activeMode, bounds, finishPreviewCrop, hoveredWindow]);

  const handleScreenClick = useCallback(() => {
    if (activeMode !== 'fullscreen' || !bounds) {
      return;
    }

    const monitor = resolveFullscreenMonitor();
    if (!monitor) {
      return;
    }

    void finishPreviewCrop(toOverlayRect(monitor, bounds));
  }, [activeMode, bounds, finishPreviewCrop, resolveFullscreenMonitor]);

  const handleTargetClick = useCallback(() => {
    if (activeMode === 'window') {
      handleWindowClick();
      return;
    }

    if (activeMode === 'fullscreen') {
      handleScreenClick();
    }
  }, [activeMode, handleScreenClick, handleWindowClick]);

  const handleConfirm = useCallback(() => {
    if (activeMode === 'region') {
      handleRegionConfirm();
      return;
    }

    if (activeMode === 'fullscreen') {
      handleScreenClick();
    }
  }, [activeMode, handleRegionConfirm, handleScreenClick]);

  const handlePointerMove = useCallback(
    async (event: React.PointerEvent<HTMLDivElement>) => {
      if (!bounds) {
        return;
      }

      const point = clientToBounds(event.clientX, event.clientY, bounds, viewport);
      const screenX = Math.round(point.x) + bounds.x;
      const screenY = Math.round(point.y) + bounds.y;

      if (activeMode === 'window') {
        try {
          const window = await getWindowAtPoint(screenX, screenY);
          setHoveredWindow(window);
        } catch {
          setHoveredWindow(null);
        }
        return;
      }

      if (activeMode === 'fullscreen') {
        setHoveredMonitor(findMonitorAtPoint(monitors, screenX, screenY));
      }
    },
    [activeMode, bounds, monitors, setHoveredMonitor, setHoveredWindow, viewport]
  );

  useEffect(() => {
    if (!bounds) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const previous = {
      htmlWidth: html.style.width,
      htmlHeight: html.style.height,
      htmlBackground: html.style.background,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyMargin: body.style.margin,
      bodyOverflow: body.style.overflow,
      bodyBackground: body.style.background,
      rootWidth: root?.style.width ?? '',
      rootHeight: root?.style.height ?? '',
    };

    html.style.width = '100%';
    html.style.height = '100%';
    html.style.background = 'transparent';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.margin = '0';
    body.style.overflow = 'hidden';
    body.style.background = 'transparent';
    if (root) {
      root.style.width = '100%';
      root.style.height = '100%';
    }

    return () => {
      html.style.width = previous.htmlWidth;
      html.style.height = previous.htmlHeight;
      html.style.background = previous.htmlBackground;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      body.style.margin = previous.bodyMargin;
      body.style.overflow = previous.bodyOverflow;
      body.style.background = previous.bodyBackground;
      if (root) {
        root.style.width = previous.rootWidth;
        root.style.height = previous.rootHeight;
      }
    };
  }, [bounds]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void handleCancel();
        return;
      }

      if (
        event.key === 'Enter' &&
        ((activeMode === 'region' && selection) || activeMode === 'fullscreen')
      ) {
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMode, handleCancel, handleConfirm, selection]);

  if (!bounds) {
    return null;
  }

  const showConfirm = activeMode === 'region' || activeMode === 'fullscreen';

  const confirmDisabled =
    (activeMode === 'region' && !selection) ||
    (activeMode === 'fullscreen' && !resolveFullscreenMonitor());

  const overlayCursor = captureOverlayCursor(activeMode);
  const toolbarContainerStyle = captureToolbarContainerStyle(bounds, monitors, viewport);
  const toolbarStyle = captureToolbarStyle();

  return (
    <div
      data-testid="capture-overlay"
      role="application"
      aria-label="Screen capture overlay"
      className="relative h-full w-full overflow-hidden text-white"
      style={{
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed ? 'auto' : 'none',
        ...(overlayCursor ? { cursor: overlayCursor } : {}),
      }}
      onPointerMove={handlePointerMove}
      onClick={
        activeMode === 'window' || activeMode === 'fullscreen' ? handleTargetClick : undefined
      }
      onKeyDown={(event) => {
        if (
          (activeMode === 'window' || activeMode === 'fullscreen') &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          handleTargetClick();
        }
      }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/25" />

      <div style={toolbarContainerStyle}>
        <div style={toolbarStyle}>
          <CaptureToolbar
            activeMode={activeMode}
            onModeChange={handleModeChange}
            onCancel={() => void handleCancel()}
            onConfirm={showConfirm ? handleConfirm : undefined}
            confirmDisabled={confirmDisabled}
          />
        </div>
      </div>

      <div className="relative z-10 h-full w-full">
        {activeMode === 'region' ? (
          <RegionSelector selection={selection} onSelectionChange={setSelection} />
        ) : null}

        {activeMode === 'window' ? (
          <WindowHighlight window={hoveredWindow} bounds={bounds} viewport={viewport} />
        ) : null}

        {activeMode === 'fullscreen' ? (
          <MonitorHighlight monitor={hoveredMonitor} bounds={bounds} viewport={viewport} />
        ) : null}

        {error ? (
          <div
            data-testid="capture-error"
            className="pointer-events-none absolute inset-x-0 top-6 flex justify-center"
          >
            <div className="rounded-full bg-destructive px-4 py-2 text-sm text-white">{error}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

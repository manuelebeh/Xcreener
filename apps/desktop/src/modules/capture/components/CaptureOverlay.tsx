import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCallback, useEffect, useState } from 'react';
import type {
  CaptureDelaySecs,
  CaptureMode,
  CaptureNativeRequest,
  CaptureProgressPayload,
  Rect,
  WindowInfo,
} from '@/shared/types/ipc';
import { cropObjectUrlToPngBytes, getImageDimensionsFromPng } from '@/shared/utils/image';
import {
  cancelCaptureOverlay,
  cancelLiveCapture,
  captureNative,
  captureScrollingWindow,
  getWindowAtPoint,
  hideCaptureOverlay,
  stopScrollingCapture,
} from '@/tauri/commands';
import { captureOverlayCursor } from '../captureCursors';
import { captureToolbarContainerStyle, captureToolbarStyle } from '../captureToolbarPlacement';
import { findMonitorAtPoint } from '../findMonitorAtPoint';
import {
  clientToBounds,
  getOverlayViewport,
  isWindowsOverlay,
  type OverlayViewport,
  viewportRectToBounds,
} from '../overlayCoordinates';
import { useCaptureStore } from '../store';
import { isLiveOverlayMode, needsNativeCapture } from '../utils/captureFlow';
import { toOverlayRect } from '../toOverlayRect';
import { CaptureCountdown } from './CaptureCountdown';
import { CaptureProgress } from './CaptureProgress';
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

function isWindowSelectionMode(mode: CaptureMode): boolean {
  return mode === 'window' || mode === 'scroll' || mode === 'menu';
}

export function CaptureOverlay() {
  const activeMode = useCaptureStore((s) => s.activeMode);
  const delaySecs = useCaptureStore((s) => s.delaySecs);
  const liveOverlay = useCaptureStore((s) => s.liveOverlay);
  const bounds = useCaptureStore((s) => s.bounds);
  const monitors = useCaptureStore((s) => s.monitors);
  const webviewLayout = useCaptureStore((s) => s.webviewLayout);
  const hoveredWindow = useCaptureStore((s) => s.hoveredWindow);
  const hoveredMonitor = useCaptureStore((s) => s.hoveredMonitor);
  const previewUrl = useCaptureStore((s) => s.previewUrl);
  const selection = useCaptureStore((s) => s.selection);
  const error = useCaptureStore((s) => s.error);
  const isCapturing = useCaptureStore((s) => s.isCapturing);
  const countdownSecs = useCaptureStore((s) => s.countdownSecs);
  const scrollFrame = useCaptureStore((s) => s.scrollFrame);
  const scrollFinishing = useCaptureStore((s) => s.scrollFinishing);
  const progressHudMode = useCaptureStore((s) => s.progressHudMode);
  const setProgressHudMode = useCaptureStore((s) => s.setProgressHudMode);
  const setScrollFinishing = useCaptureStore((s) => s.setScrollFinishing);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setDelaySecs = useCaptureStore((s) => s.setDelaySecs);
  const setLiveOverlay = useCaptureStore((s) => s.setLiveOverlay);
  const setSelection = useCaptureStore((s) => s.setSelection);
  const setHoveredWindow = useCaptureStore((s) => s.setHoveredWindow);
  const setHoveredMonitor = useCaptureStore((s) => s.setHoveredMonitor);
  const setError = useCaptureStore((s) => s.setError);
  const setCapturing = useCaptureStore((s) => s.setCapturing);
  const setCountdownSecs = useCaptureStore((s) => s.setCountdownSecs);
  const setScrollFrame = useCaptureStore((s) => s.setScrollFrame);
  const reset = useCaptureStore((s) => s.reset);
  const [revealed, setRevealed] = useState(false);
  const [viewport, setViewport] = useState<OverlayViewport>(() =>
    getOverlayViewport(bounds, monitors, { webviewLayout })
  );

  const showPreview = previewUrl && !isLiveOverlayMode(activeMode, liveOverlay);

  useEffect(() => {
    if (isWindowsOverlay()) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
  }, [bounds, previewUrl, liveOverlay, activeMode]);

  useEffect(() => {
    if (!isWindowsOverlay() || !webviewLayout) {
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
        // Not running inside Tauri - tests and storybook.
      });

    return () => {
      cancelled = true;
      window.removeEventListener('resize', updateViewport);
    };
  }, [bounds, monitors, webviewLayout]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<CaptureProgressPayload>('capture-progress', (event) => {
      if (event.payload.phase === 'countdown' && event.payload.remainingSecs) {
        setCountdownSecs(event.payload.remainingSecs);
      }

      if (event.payload.phase === 'scroll' && event.payload.current != null) {
        if (!useCaptureStore.getState().scrollFinishing) {
          setScrollFrame(event.payload.current);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [setCountdownSecs, setScrollFrame]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen('capture-overlay-progress-hud', () => {
      setProgressHudMode(true);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [setProgressHudMode]);

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
      setCapturing(false);
      setCountdownSecs(null);
      setScrollFrame(null);
      setProgressHudMode(false);
      setError(message);
      await publishCaptureError(message);
      await hideCaptureOverlay();
    },
    [setCapturing, setCountdownSecs, setError, setProgressHudMode, setScrollFrame]
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
    [bounds, finishCapture, handleCaptureFailure, previewUrl, viewport.height, viewport.width]
  );

  const finishNativeCapture = useCallback(
    async (request: CaptureNativeRequest) => {
      setError(null);
      setCapturing(true);
      setCountdownSecs(request.delaySecs > 0 ? request.delaySecs : null);
      setScrollFrame(null);

      try {
        const bytes = await captureNative(request);
        await finishCapture(bytes);
      } catch (failure) {
        await handleCaptureFailure(failure);
      }
    },
    [finishCapture, handleCaptureFailure, setCapturing, setCountdownSecs, setError, setScrollFrame]
  );

  const finishScrollCapture = useCallback(
    async (window: WindowInfo) => {
      setError(null);
      setCapturing(true);
      setProgressHudMode(true);
      setScrollFinishing(false);
      setCountdownSecs(null);
      setScrollFrame(0);

      try {
        await emit('capture-progress', { phase: 'scroll', current: 0 });
        const bytes = await captureScrollingWindow(window);
        await finishCapture(bytes);
      } catch (failure) {
        await handleCaptureFailure(failure);
      }
    },
    [
      finishCapture,
      handleCaptureFailure,
      setCapturing,
      setCountdownSecs,
      setError,
      setProgressHudMode,
      setScrollFinishing,
      setScrollFrame,
    ]
  );

  const captureRect = useCallback(
    async (rect: Rect) => {
      if (needsNativeCapture(activeMode, delaySecs)) {
        await finishNativeCapture({
          kind: 'region',
          rect,
          delaySecs,
        });
        return;
      }

      await finishPreviewCrop(rect);
    },
    [activeMode, delaySecs, finishNativeCapture, finishPreviewCrop]
  );

  const handleCancel = useCallback(async () => {
    if (isCapturing) {
      await cancelLiveCapture();
    }
    await cancelCaptureOverlay();
    reset();
  }, [isCapturing, reset]);

  const handleStopScroll = useCallback(async () => {
    if (useCaptureStore.getState().scrollFinishing) {
      return;
    }

    setScrollFinishing(true);
    await stopScrollingCapture();
  }, [setScrollFinishing]);

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

      if (mode === 'menu') {
        setDelaySecs(3);
        setLiveOverlay(true);
        return;
      }

      if (mode === 'scroll') {
        setDelaySecs(0);
        setLiveOverlay(false);
        return;
      }

      setLiveOverlay(false);
    },
    [
      setActiveMode,
      setDelaySecs,
      setError,
      setHoveredMonitor,
      setHoveredWindow,
      setLiveOverlay,
      setSelection,
    ]
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

    void captureRect(viewportRectToBounds(selection, bounds, viewport));
  }, [bounds, captureRect, selection, viewport]);

  const handleWindowClick = useCallback(() => {
    if (!hoveredWindow || !isWindowSelectionMode(activeMode) || !bounds) {
      return;
    }

    if (activeMode === 'scroll') {
      void finishScrollCapture(hoveredWindow);
      return;
    }

    const rect = toOverlayRect(hoveredWindow, bounds);

    if (needsNativeCapture(activeMode, delaySecs)) {
      void finishNativeCapture({
        kind: 'window',
        windowId: hoveredWindow.id,
        delaySecs,
      });
      return;
    }

    void finishPreviewCrop(rect);
  }, [
    activeMode,
    bounds,
    delaySecs,
    finishNativeCapture,
    finishPreviewCrop,
    finishScrollCapture,
    hoveredWindow,
  ]);

  const handleScreenClick = useCallback(() => {
    if (activeMode !== 'fullscreen' || !bounds) {
      return;
    }

    const monitor = resolveFullscreenMonitor();
    if (!monitor) {
      return;
    }

    const rect = toOverlayRect(monitor, bounds);

    if (needsNativeCapture(activeMode, delaySecs)) {
      void finishNativeCapture({
        kind: 'fullscreen',
        monitorId: monitor.id,
        delaySecs,
      });
      return;
    }

    void finishPreviewCrop(rect);
  }, [
    activeMode,
    bounds,
    delaySecs,
    finishNativeCapture,
    finishPreviewCrop,
    resolveFullscreenMonitor,
  ]);

  const handleTargetClick = useCallback(() => {
    if (isWindowSelectionMode(activeMode)) {
      handleWindowClick();
      return;
    }

    if (activeMode === 'fullscreen') {
      handleScreenClick();
    }
  }, [activeMode, handleScreenClick, handleWindowClick]);

  const handleConfirm = useCallback(() => {
    if (activeMode === 'menu') {
      if (selection) {
        handleRegionConfirm();
      } else if (hoveredWindow) {
        handleWindowClick();
      }
      return;
    }

    if (activeMode === 'region') {
      handleRegionConfirm();
      return;
    }

    if (activeMode === 'scroll') {
      handleWindowClick();
      return;
    }

    if (activeMode === 'fullscreen') {
      handleScreenClick();
    }
  }, [
    activeMode,
    handleRegionConfirm,
    handleScreenClick,
    handleWindowClick,
    hoveredWindow,
    selection,
  ]);

  const handlePointerMove = useCallback(
    async (event: React.PointerEvent<HTMLDivElement>) => {
      if (!bounds || isCapturing) {
        return;
      }

      const point = clientToBounds(event.clientX, event.clientY, bounds, viewport);
      const screenX = Math.round(point.x) + bounds.x;
      const screenY = Math.round(point.y) + bounds.y;

      if (isWindowSelectionMode(activeMode)) {
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
    [activeMode, bounds, isCapturing, monitors, setHoveredMonitor, setHoveredWindow, viewport]
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
        if (progressHudMode && !scrollFinishing) {
          void handleStopScroll();
        } else if (!progressHudMode) {
          void handleCancel();
        }
        return;
      }

      if (isCapturing) {
        return;
      }

      const canConfirmRegion =
        (activeMode === 'region' || activeMode === 'menu') && Boolean(selection);
      const canConfirmScroll = activeMode === 'scroll' && Boolean(hoveredWindow);
      const canConfirmFullscreen = activeMode === 'fullscreen';

      if (
        event.key === 'Enter' &&
        (canConfirmRegion || canConfirmScroll || canConfirmFullscreen)
      ) {
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeMode, handleCancel, handleConfirm, handleStopScroll, hoveredWindow, isCapturing, progressHudMode, scrollFinishing, selection]);

  if (!bounds) {
    return null;
  }

  if (progressHudMode) {
    return (
      <div
        data-testid="capture-overlay"
        className="relative h-full w-full overflow-hidden"
        role="status"
        aria-label="Scrolling capture progress"
      >
        <CaptureProgress
          phase="scroll"
          current={scrollFrame}
          variant="hud"
          finishing={scrollFinishing}
          onDone={() => void handleStopScroll()}
        />
      </div>
    );
  }

  const showConfirm =
    activeMode === 'region' ||
    activeMode === 'fullscreen' ||
    activeMode === 'scroll' ||
    activeMode === 'menu';

  const confirmDisabled =
    (activeMode === 'region' && !selection) ||
    (activeMode === 'menu' && !selection && !hoveredWindow) ||
    (activeMode === 'scroll' && !hoveredWindow) ||
    (activeMode === 'fullscreen' && !resolveFullscreenMonitor());

  const overlayCursor = captureOverlayCursor(activeMode);
  const toolbarContainerStyle = captureToolbarContainerStyle(bounds, monitors, viewport);
  const toolbarStyle = captureToolbarStyle();
  const dimOpacity = isLiveOverlayMode(activeMode, liveOverlay) ? 'bg-black/45' : 'bg-black/25';

  return (
    <div
      data-testid="capture-overlay"
      role="application"
      aria-label="Screen capture overlay"
      className="relative h-full w-full overflow-hidden text-white"
      style={{
        opacity: revealed ? 1 : 0,
        pointerEvents: revealed && !isCapturing ? 'auto' : 'none',
        ...(overlayCursor ? { cursor: overlayCursor } : {}),
      }}
      onPointerMove={handlePointerMove}
      onClick={
        isWindowSelectionMode(activeMode) || activeMode === 'fullscreen'
          ? handleTargetClick
          : undefined
      }
      onKeyDown={(event) => {
        if (
          (isWindowSelectionMode(activeMode) || activeMode === 'fullscreen') &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          handleTargetClick();
        }
      }}
    >
      {showPreview ? (
        <img
          src={previewUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />
      ) : null}
      <div className={`pointer-events-none absolute inset-0 z-[1] ${dimOpacity}`} />

      <div style={toolbarContainerStyle}>
        <div style={toolbarStyle}>
          <CaptureToolbar
            activeMode={activeMode}
            delaySecs={delaySecs}
            isCapturing={isCapturing}
            onModeChange={handleModeChange}
            onDelayChange={(delay: CaptureDelaySecs) => setDelaySecs(delay)}
            onCancel={() => void handleCancel()}
            onConfirm={showConfirm ? handleConfirm : undefined}
            confirmDisabled={confirmDisabled}
          />
        </div>
      </div>

      <div className="relative z-10 h-full w-full">
        {activeMode === 'region' || activeMode === 'menu' ? (
          <RegionSelector selection={selection} onSelectionChange={setSelection} />
        ) : null}

        {isWindowSelectionMode(activeMode) ? (
          <WindowHighlight window={hoveredWindow} bounds={bounds} viewport={viewport} />
        ) : null}

        {activeMode === 'fullscreen' ? (
          <MonitorHighlight monitor={hoveredMonitor} bounds={bounds} viewport={viewport} />
        ) : null}

        {countdownSecs ? <CaptureCountdown remainingSecs={countdownSecs} /> : null}
        {scrollFrame ? <CaptureProgress phase="scroll" current={scrollFrame} /> : null}

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

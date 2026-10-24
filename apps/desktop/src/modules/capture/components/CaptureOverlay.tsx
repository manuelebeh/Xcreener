import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CaptureDelaySecs,
  CaptureMediaKind,
  CaptureMode,
  CaptureNativeRequest,
  CaptureProgressPayload,
  CaptureRecordStartRequest,
  CaptureTargetMode,
  Rect,
  WindowInfo,
} from '@/shared/types/ipc';
import { cropObjectUrlToPngBytes, getImageDimensionsFromPng } from '@/shared/utils/image';
import {
  cancelCaptureOverlay,
  cancelLiveCapture,
  cancelRegionRecording,
  captureNative,
  captureScrollingWindow,
  getWindowAtPoint,
  hideCaptureOverlay,
  listWindows,
  pauseRegionRecording,
  resumeRegionRecording,
  startRegionRecording,
  stopRegionRecording,
  stopScrollingCapture,
} from '@/tauri/commands';
import { captureOverlayCursor } from '../captureCursors';
import { captureToolbarContainerStyle, captureToolbarStyle } from '../captureToolbarPlacement';
import { findMonitorAtPoint } from '../findMonitorAtPoint';
import { useRecordingElapsed } from '../hooks/useRecordingElapsed';
import {
  clientToBounds,
  getOverlayViewport,
  isWindowsOverlay,
  type OverlayViewport,
  viewportRectToBounds,
} from '../overlayCoordinates';
import { useCaptureStore } from '../store';
import { toOverlayRect } from '../toOverlayRect';
import { isLiveOverlayMode, needsNativeCapture } from '../utils/captureFlow';
import { normalizeTargetForMediaKind } from '../utils/captureModes';
import {
  defaultSelection,
  isArrowKey,
  nextWindow,
  nudgeSelection,
} from '../utils/keyboardSelection';
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
  const mediaKind = useCaptureStore((s) => s.mediaKind);
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
  const recordingFinishing = useCaptureStore((s) => s.recordingFinishing);
  const progressHudMode = useCaptureStore((s) => s.progressHudMode);
  const recordingPaused = useCaptureStore((s) => s.recordingPaused);
  const outputFormat = useCaptureStore((s) => s.outputFormat);
  const gifQuality = useCaptureStore((s) => s.gifQuality);
  const setGifQuality = useCaptureStore((s) => s.setGifQuality);
  const captureProgress = useCaptureStore((s) => s.captureProgress);
  const setProgressHudMode = useCaptureStore((s) => s.setProgressHudMode);
  const setScrollFinishing = useCaptureStore((s) => s.setScrollFinishing);
  const setRecordingFinishing = useCaptureStore((s) => s.setRecordingFinishing);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setMediaKind = useCaptureStore((s) => s.setMediaKind);
  const setDelaySecs = useCaptureStore((s) => s.setDelaySecs);
  const setLiveOverlay = useCaptureStore((s) => s.setLiveOverlay);
  const setSelection = useCaptureStore((s) => s.setSelection);
  const setHoveredWindow = useCaptureStore((s) => s.setHoveredWindow);
  const setHoveredMonitor = useCaptureStore((s) => s.setHoveredMonitor);
  const setError = useCaptureStore((s) => s.setError);
  const setCapturing = useCaptureStore((s) => s.setCapturing);
  const setCountdownSecs = useCaptureStore((s) => s.setCountdownSecs);
  const setScrollFrame = useCaptureStore((s) => s.setScrollFrame);
  const setRecordingPaused = useCaptureStore((s) => s.setRecordingPaused);
  const setOutputFormat = useCaptureStore((s) => s.setOutputFormat);
  const setCaptureProgress = useCaptureStore((s) => s.setCaptureProgress);
  const reset = useCaptureStore((s) => s.reset);
  const finishRecordingRef = useRef<() => Promise<void>>(async () => {});
  const rootRef = useRef<HTMLDivElement>(null);
  // Window list for Tab cycling, fetched once per selection mode.
  const windowsRef = useRef<{ mode: CaptureMode; windows: WindowInfo[] } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [recordingAnchorMs, setRecordingAnchorMs] = useState<number | null>(null);
  const [viewport, setViewport] = useState<OverlayViewport>(() =>
    getOverlayViewport(bounds, monitors, { webviewLayout })
  );

  const handleMaxRecordingDuration = useCallback(() => {
    void finishRecordingRef.current();
  }, []);

  const maxRecordingSecs = captureProgress?.maxDurationSecs ?? 30;
  const isVideo = mediaKind === 'video';
  const recordingElapsedSecs = useRecordingElapsed(
    progressHudMode && isVideo && !recordingFinishing,
    recordingPaused,
    maxRecordingSecs,
    handleMaxRecordingDuration,
    recordingAnchorMs
  );

  const showPreview = previewUrl && !isLiveOverlayMode(activeMode, liveOverlay);

  useEffect(() => {
    if (isWindowsOverlay()) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
  }, []);

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

      if (event.payload.phase === 'recording') {
        setCaptureProgress(event.payload);
        setRecordingPaused(Boolean(event.payload.paused));
        const { elapsedSecs } = event.payload;
        if (elapsedSecs != null) {
          setRecordingAnchorMs((previous) => previous ?? Date.now() - elapsedSecs * 1000);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [setCountdownSecs, setScrollFrame, setCaptureProgress, setRecordingPaused]);

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
    [
      bounds,
      finishCapture,
      handleCaptureFailure,
      previewUrl,
      viewport.height,
      viewport.width,
      setError,
    ]
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

  const finishRecordCapture = useCallback(
    async (rect: Rect) => {
      setError(null);
      setCapturing(true);
      setRecordingPaused(false);
      setCountdownSecs(null);
      setScrollFrame(null);

      const request: CaptureRecordStartRequest = {
        rect,
        outputFormat,
        gifQuality,
        // GIFs auto-stop at 8s (short shareable loops); MP4 keeps the full 30s.
        maxDurationSecs: outputFormat === 'gif' ? 8 : 30,
      };

      try {
        await startRegionRecording(request);
      } catch (failure) {
        await handleCaptureFailure(failure);
      }
    },
    [
      gifQuality,
      handleCaptureFailure,
      outputFormat,
      setCapturing,
      setCountdownSecs,
      setError,
      setRecordingPaused,
      setScrollFrame,
    ]
  );

  const finishRecording = useCallback(async () => {
    if (useCaptureStore.getState().recordingFinishing) {
      return;
    }

    setRecordingFinishing(true);

    try {
      await stopRegionRecording();
      await hideCaptureOverlay();
      reset();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      if (
        message.includes('no recording in progress') ||
        message.includes('already finalized') ||
        message.includes('recording session not found')
      ) {
        return;
      }

      setRecordingFinishing(false);
      await handleCaptureFailure(failure);
    }
  }, [handleCaptureFailure, reset, setRecordingFinishing]);

  finishRecordingRef.current = finishRecording;

  const handlePauseRecording = useCallback(async () => {
    try {
      await pauseRegionRecording();
      setRecordingPaused(true);
    } catch (failure) {
      await handleCaptureFailure(failure);
    }
  }, [handleCaptureFailure, setRecordingPaused]);

  const handleResumeRecording = useCallback(async () => {
    try {
      await resumeRegionRecording();
      setRecordingPaused(false);
    } catch (failure) {
      await handleCaptureFailure(failure);
    }
  }, [handleCaptureFailure, setRecordingPaused]);

  const handleCancelRecording = useCallback(async () => {
    await cancelRegionRecording();
    await cancelCaptureOverlay();
    reset();
  }, [reset]);

  const captureRect = useCallback(
    async (rect: Rect) => {
      if (needsNativeCapture(activeMode, delaySecs, mediaKind)) {
        await finishNativeCapture({
          kind: 'region',
          rect,
          delaySecs,
        });
        return;
      }

      await finishPreviewCrop(rect);
    },
    [activeMode, delaySecs, finishNativeCapture, finishPreviewCrop, mediaKind]
  );

  const handleCancel = useCallback(async () => {
    if (isCapturing && isVideo) {
      await handleCancelRecording();
      return;
    }

    if (isCapturing) {
      await cancelLiveCapture();
    }
    await cancelCaptureOverlay();
    reset();
  }, [handleCancelRecording, isCapturing, isVideo, reset]);

  const applyTargetModeDefaults = useCallback(
    (mode: CaptureTargetMode, kind: CaptureMediaKind) => {
      if (kind === 'video') {
        setDelaySecs(0);
        setLiveOverlay(false);
        return;
      }

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
    [setDelaySecs, setLiveOverlay]
  );

  const handleMediaKindChange = useCallback(
    (kind: CaptureMediaKind) => {
      setMediaKind(kind);
      setHoveredWindow(null);
      setHoveredMonitor(null);
      setSelection(null);
      setError(null);

      const currentTarget = activeMode === 'idle' ? 'region' : (activeMode as CaptureTargetMode);
      const nextMode = normalizeTargetForMediaKind(currentTarget, kind);
      setActiveMode(nextMode);
      applyTargetModeDefaults(nextMode, kind);
    },
    [
      activeMode,
      applyTargetModeDefaults,
      setActiveMode,
      setError,
      setHoveredMonitor,
      setHoveredWindow,
      setMediaKind,
      setSelection,
    ]
  );

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
      applyTargetModeDefaults(mode, mediaKind);
    },
    [
      applyTargetModeDefaults,
      mediaKind,
      setActiveMode,
      setError,
      setHoveredMonitor,
      setHoveredWindow,
      setSelection,
    ]
  );

  const handleStopScroll = useCallback(async () => {
    if (useCaptureStore.getState().scrollFinishing) {
      return;
    }

    setScrollFinishing(true);
    await stopScrollingCapture();
  }, [setScrollFinishing]);

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

    const rect = viewportRectToBounds(selection, bounds, viewport);
    if (isVideo) {
      void finishRecordCapture(rect);
      return;
    }

    void captureRect(rect);
  }, [bounds, captureRect, finishRecordCapture, isVideo, selection, viewport]);

  const handleWindowClick = useCallback(() => {
    if (!hoveredWindow || !isWindowSelectionMode(activeMode) || !bounds) {
      return;
    }

    if (activeMode === 'scroll') {
      void finishScrollCapture(hoveredWindow);
      return;
    }

    const rect = toOverlayRect(hoveredWindow, bounds);

    if (needsNativeCapture(activeMode, delaySecs, mediaKind)) {
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
    mediaKind,
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

    if (needsNativeCapture(activeMode, delaySecs, mediaKind)) {
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
    mediaKind,
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

  // Keyboard alternative to dragging and hovering (WCAG 2.5.7, 2.1.1).
  useEffect(() => {
    if (revealed) {
      rootRef.current?.focus({ preventScroll: true });
    }
  }, [revealed]);

  const cycleWindow = useCallback(
    async (reverse: boolean) => {
      if (windowsRef.current?.mode !== activeMode) {
        windowsRef.current = { mode: activeMode, windows: await listWindows() };
      }
      const next = nextWindow(windowsRef.current.windows, hoveredWindow?.id ?? null, reverse);
      setHoveredWindow(next);
      return next;
    },
    [activeMode, hoveredWindow, setHoveredWindow]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (progressHudMode && isVideo) {
          void handleCancelRecording();
        } else if (progressHudMode && !scrollFinishing) {
          void handleStopScroll();
        } else if (!progressHudMode) {
          void handleCancel();
        }
        return;
      }

      if (isCapturing) {
        return;
      }

      // Arrows and Tab drive the selection only from the overlay surface, so the
      // toolbar keeps its own keyboard behavior.
      const onSurface = event.target === rootRef.current || event.target === document.body;

      if (
        onSurface &&
        isArrowKey(event.key) &&
        (activeMode === 'region' || activeMode === 'menu')
      ) {
        event.preventDefault();
        setSelection(
          selection
            ? nudgeSelection(
                selection,
                event.key,
                { shift: event.shiftKey, alt: event.altKey },
                viewport
              )
            : defaultSelection(viewport)
        );
        return;
      }

      if (onSurface && event.key === 'Tab' && isWindowSelectionMode(activeMode)) {
        // Past the last window, Tab moves focus on to the toolbar.
        const cached = windowsRef.current?.mode === activeMode ? windowsRef.current.windows : null;
        if (!cached || nextWindow(cached, hoveredWindow?.id ?? null, event.shiftKey)) {
          event.preventDefault();
          void cycleWindow(event.shiftKey);
          return;
        }
      }

      const canConfirmRegion =
        (activeMode === 'region' || activeMode === 'menu') && Boolean(selection);
      const canConfirmScroll = activeMode === 'scroll' && Boolean(hoveredWindow);
      const canConfirmFullscreen = activeMode === 'fullscreen';

      if (event.key === 'Enter' && (canConfirmRegion || canConfirmScroll || canConfirmFullscreen)) {
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeMode,
    handleCancel,
    handleCancelRecording,
    handleConfirm,
    handleStopScroll,
    cycleWindow,
    hoveredWindow,
    isCapturing,
    isVideo,
    progressHudMode,
    scrollFinishing,
    selection,
    setSelection,
    viewport,
  ]);

  if (!bounds) {
    return null;
  }

  if (progressHudMode) {
    const hudPhase = isVideo ? 'recording' : 'scroll';
    return (
      <div
        data-testid="capture-overlay"
        className="relative h-full w-full overflow-hidden"
        role="status"
        aria-label={hudPhase === 'recording' ? 'Recording progress' : 'Scrolling capture progress'}
      >
        <CaptureProgress
          phase={hudPhase}
          current={scrollFrame}
          elapsedSecs={hudPhase === 'recording' ? recordingElapsedSecs : null}
          maxDurationSecs={captureProgress?.maxDurationSecs ?? 30}
          paused={recordingPaused}
          variant="hud"
          finishing={hudPhase === 'recording' ? recordingFinishing : scrollFinishing}
          onDone={
            hudPhase === 'recording' ? () => void finishRecording() : () => void handleStopScroll()
          }
          onPause={hudPhase === 'recording' ? () => void handlePauseRecording() : undefined}
          onResume={hudPhase === 'recording' ? () => void handleResumeRecording() : undefined}
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
  const announcement =
    (activeMode === 'region' || activeMode === 'menu') && selection
      ? `Selection ${Math.round(selection.width)} by ${Math.round(selection.height)}`
      : isWindowSelectionMode(activeMode) && hoveredWindow
        ? `Window ${hoveredWindow.title || 'untitled'}`
        : '';

  return (
    <div
      ref={rootRef}
      data-testid="capture-overlay"
      role="application"
      aria-label="Screen capture overlay"
      aria-describedby="capture-overlay-keys"
      tabIndex={-1}
      className="relative h-full w-full overflow-hidden text-white outline-none"
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
      <p id="capture-overlay-keys" className="sr-only">
        Arrow keys move the selection, Alt with arrow keys resizes it, Shift makes steps of 10
        pixels. Tab goes through windows. Enter captures, Escape cancels.
      </p>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div style={toolbarContainerStyle}>
        <div style={toolbarStyle}>
          <CaptureToolbar
            mediaKind={mediaKind}
            activeMode={activeMode}
            delaySecs={delaySecs}
            outputFormat={outputFormat}
            gifQuality={gifQuality}
            isCapturing={isCapturing}
            onMediaKindChange={handleMediaKindChange}
            onModeChange={handleModeChange}
            onDelayChange={(delay: CaptureDelaySecs) => setDelaySecs(delay)}
            onOutputFormatChange={setOutputFormat}
            onGifQualityChange={setGifQuality}
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

import { emit } from '@tauri-apps/api/event';
import { useCallback, useEffect } from 'react';
import type { CaptureMode, Rect } from '@/shared/types/ipc';
import { cropObjectUrlToPngBytes, getImageDimensionsFromPng } from '@/shared/utils/image';
import { cancelCaptureOverlay, getWindowAtPoint, hideCaptureOverlay } from '@/tauri/commands';
import { captureOverlayCursor } from '../captureCursors';
import { findMonitorAtPoint } from '../findMonitorAtPoint';
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
      if (!previewUrl) {
        return;
      }

      setError(null);
      try {
        const cropped = await cropObjectUrlToPngBytes(previewUrl, rect);
        await finishCapture(cropped.bytes);
      } catch (failure) {
        await handleCaptureFailure(failure);
      }
    },
    [finishCapture, handleCaptureFailure, previewUrl, setError]
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
    if (!selection) {
      return;
    }

    void finishPreviewCrop(selection);
  }, [finishPreviewCrop, selection]);

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

      const screenX = event.clientX + bounds.x;
      const screenY = event.clientY + bounds.y;

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
    [activeMode, bounds, monitors, setHoveredMonitor, setHoveredWindow]
  );

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

  const boundsOffset = { x: bounds.x, y: bounds.y };
  const overlayCursor = captureOverlayCursor(activeMode);

  return (
    <div
      data-testid="capture-overlay"
      role="application"
      aria-label="Screen capture overlay"
      className="relative h-screen w-screen overflow-hidden text-white"
      style={overlayCursor ? { cursor: overlayCursor } : undefined}
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
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/25" />

      <div className="relative z-10 h-full w-full">
        {activeMode === 'region' ? (
          <RegionSelector selection={selection} onSelectionChange={setSelection} />
        ) : null}

        {activeMode === 'window' ? (
          <WindowHighlight window={hoveredWindow} boundsOffset={boundsOffset} />
        ) : null}

        {activeMode === 'fullscreen' ? (
          <MonitorHighlight monitor={hoveredMonitor} boundsOffset={boundsOffset} />
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <CaptureToolbar
            activeMode={activeMode}
            onModeChange={handleModeChange}
            onCancel={() => void handleCancel()}
            onConfirm={showConfirm ? handleConfirm : undefined}
            confirmDisabled={confirmDisabled}
          />
        </div>

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

import { listen } from '@tauri-apps/api/event';
import { useEffect, useLayoutEffect } from 'react';
import type { CaptureOverlayInitPayload, OverlayWebviewLayout } from '@/shared/types/ipc';
import { bytesToObjectUrl } from '@/shared/utils/image';
import { captureOverlayReady } from '@/tauri/commands';
import { useCaptureStore } from '../store';
import { CaptureOverlay } from './CaptureOverlay';

export function CaptureOverlayRoot() {
  const bounds = useCaptureStore((s) => s.bounds);
  const progressHudMode = useCaptureStore((s) => s.progressHudMode);
  const setBounds = useCaptureStore((s) => s.setBounds);
  const setMonitors = useCaptureStore((s) => s.setMonitors);
  const setWebviewLayout = useCaptureStore((s) => s.setWebviewLayout);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setMediaKind = useCaptureStore((s) => s.setMediaKind);
  const setPreviewUrl = useCaptureStore((s) => s.setPreviewUrl);
  const setLiveOverlay = useCaptureStore((s) => s.setLiveOverlay);

  useEffect(() => {
    let cancelled = false;
    let unlistenInit: (() => void) | undefined;
    let unlistenPresented: (() => void) | undefined;

    listen<CaptureOverlayInitPayload>('capture-overlay-init', (event) => {
      if (cancelled) {
        return;
      }

      const previousPreview = useCaptureStore.getState().previewUrl;
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
      }

      setWebviewLayout(null);
      setBounds(event.payload.bounds);
      setMonitors(event.payload.monitors);
      setLiveOverlay(Boolean(event.payload.liveOverlay));
      setPreviewUrl(
        event.payload.previewPng?.length ? bytesToObjectUrl(event.payload.previewPng) : null
      );
      setActiveMode('region');
      setMediaKind('photo');
    }).then((fn) => {
      unlistenInit = fn;
    });

    listen<OverlayWebviewLayout>('capture-overlay-presented', (event) => {
      if (!cancelled) {
        setWebviewLayout(event.payload);
      }
    }).then((fn) => {
      unlistenPresented = fn;
    });

    return () => {
      cancelled = true;
      unlistenInit?.();
      unlistenPresented?.();
    };
  }, [
    setActiveMode,
    setBounds,
    setLiveOverlay,
    setMediaKind,
    setMonitors,
    setPreviewUrl,
    setWebviewLayout,
  ]);

  useEffect(() => {
    if (progressHudMode) {
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      return;
    }

    document.documentElement.style.backgroundColor = '#000';
    document.body.style.backgroundColor = '#000';

    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, [progressHudMode]);

  useLayoutEffect(() => {
    if (!bounds) {
      return;
    }

    void captureOverlayReady();
  }, [bounds]);

  if (!bounds) {
    return null;
  }

  return (
    <div
      className={
        progressHudMode ? 'h-screen w-screen bg-transparent' : 'h-screen w-screen bg-black'
      }
    >
      <CaptureOverlay />
    </div>
  );
}

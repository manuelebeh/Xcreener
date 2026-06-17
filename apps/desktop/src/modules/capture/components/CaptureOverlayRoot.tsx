import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import type { CaptureOverlayInitPayload, OverlayWebviewLayout } from '@/shared/types/ipc';
import { bytesToObjectUrl } from '@/shared/utils/image';
import { captureOverlayReady } from '@/tauri/commands';
import { useCaptureStore } from '../store';
import { CaptureOverlay } from './CaptureOverlay';

export function CaptureOverlayRoot() {
  const bounds = useCaptureStore((s) => s.bounds);
  const previewUrl = useCaptureStore((s) => s.previewUrl);
  const setBounds = useCaptureStore((s) => s.setBounds);
  const setMonitors = useCaptureStore((s) => s.setMonitors);
  const setWebviewLayout = useCaptureStore((s) => s.setWebviewLayout);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setPreviewUrl = useCaptureStore((s) => s.setPreviewUrl);

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
      setPreviewUrl(bytesToObjectUrl(event.payload.previewPng));
      setActiveMode('region');
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
  }, [setActiveMode, setBounds, setMonitors, setPreviewUrl, setWebviewLayout]);

  useEffect(() => {
    if (!bounds || !previewUrl) {
      return;
    }

    let cancelled = false;

    void (async () => {
      // Paint the frozen preview in the hidden webview before the native window is shown.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) {
        return;
      }

      await captureOverlayReady();
    })();

    return () => {
      cancelled = true;
    };
  }, [bounds, previewUrl]);

  if (!bounds || !previewUrl) {
    return null;
  }

  return <CaptureOverlay />;
}

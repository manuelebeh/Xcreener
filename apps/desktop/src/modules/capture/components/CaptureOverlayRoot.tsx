import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import type { CaptureOverlayInitPayload } from '@/shared/types/ipc';
import { bytesToObjectUrl } from '@/shared/utils/image';
import { captureOverlayReady } from '@/tauri/commands';
import { useCaptureStore } from '../store';
import { CaptureOverlay } from './CaptureOverlay';

export function CaptureOverlayRoot() {
  const bounds = useCaptureStore((s) => s.bounds);
  const previewUrl = useCaptureStore((s) => s.previewUrl);
  const setBounds = useCaptureStore((s) => s.setBounds);
  const setMonitors = useCaptureStore((s) => s.setMonitors);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setPreviewUrl = useCaptureStore((s) => s.setPreviewUrl);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    listen<CaptureOverlayInitPayload>('capture-overlay-init', (event) => {
      if (cancelled) {
        return;
      }

      const previousPreview = useCaptureStore.getState().previewUrl;
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
      }

      setBounds(event.payload.bounds);
      setMonitors(event.payload.monitors);
      setPreviewUrl(bytesToObjectUrl(event.payload.previewPng));
      setActiveMode('region');
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setActiveMode, setBounds, setMonitors, setPreviewUrl]);

  useEffect(() => {
    if (!bounds || !previewUrl) {
      return;
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          void captureOverlayReady();
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [bounds, previewUrl]);

  if (!bounds || !previewUrl) {
    return null;
  }

  return <CaptureOverlay />;
}

import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import type { CaptureOverlayInitPayload } from '@/shared/types/ipc';
import { bytesToObjectUrl } from '@/shared/utils/image';
import { useCaptureStore } from '../store';
import { CaptureOverlay } from './CaptureOverlay';

export function CaptureOverlayRoot() {
  const setBounds = useCaptureStore((s) => s.setBounds);
  const setMonitors = useCaptureStore((s) => s.setMonitors);
  const setActiveMode = useCaptureStore((s) => s.setActiveMode);
  const setPreviewUrl = useCaptureStore((s) => s.setPreviewUrl);
  const previewUrl = useCaptureStore((s) => s.previewUrl);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setReady(true);
      setError(null);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setActiveMode, setBounds, setMonitors, setPreviewUrl]);

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black/80 px-6 text-center text-sm text-white">
        {error}
      </div>
    );
  }

  if (!ready || !previewUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-sm text-white">
        Preparing capture…
      </div>
    );
  }

  return <CaptureOverlay />;
}

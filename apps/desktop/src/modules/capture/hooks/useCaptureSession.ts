import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/modules/editor/store';
import { persistCapture } from '@/modules/history/utils/persistCapture';
import type { CaptureErrorPayload, CaptureImagePayload, CaptureProgressPayload } from '@/shared/types/ipc';
import { bytesToImageBitmap } from '@/shared/utils/image';
import { useCaptureStore } from '../store';

export function useCaptureSession() {
  const navigate = useNavigate();
  const setScreenshot = useEditorStore((s) => s.setScreenshot);
  const setOverlayVisible = useCaptureStore((s) => s.setOverlayVisible);
  const setError = useCaptureStore((s) => s.setError);
  const setCaptureProgress = useCaptureStore((s) => s.setCaptureProgress);
  const reset = useCaptureStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;
    let unlistenImage: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;
    let unlistenProgress: (() => void) | undefined;

    void listen<CaptureProgressPayload>('capture-progress', (event) => {
      setCaptureProgress(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenProgress = fn;
    });

    void listen<CaptureImagePayload>('capture-image', async (event) => {
      try {
        setCaptureProgress(null);
        const bitmap = await bytesToImageBitmap(event.payload.bytes);
        setScreenshot(bitmap);
        persistCapture({
          bytes: event.payload.bytes,
          width: event.payload.width,
          height: event.payload.height,
        });
        setOverlayVisible(false);
        reset();
        navigate('/');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenImage = fn;
    });

    void listen<CaptureErrorPayload>('capture-error', (event) => {
      setCaptureProgress(null);
      setError(event.payload.message);
      setOverlayVisible(false);
      navigate('/');
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenError = fn;
    });

    return () => {
      cancelled = true;
      unlistenImage?.();
      unlistenError?.();
      unlistenProgress?.();
    };
  }, [navigate, reset, setCaptureProgress, setError, setOverlayVisible, setScreenshot]);
}

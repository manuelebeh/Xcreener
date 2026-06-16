import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/modules/editor/store';
import type { CaptureErrorPayload, CaptureImagePayload } from '@/shared/types/ipc';
import { bytesToImageBitmap } from '@/shared/utils/image';
import { useCaptureStore } from '../store';

export function useCaptureSession() {
  const navigate = useNavigate();
  const setScreenshot = useEditorStore((s) => s.setScreenshot);
  const setOverlayVisible = useCaptureStore((s) => s.setOverlayVisible);
  const setError = useCaptureStore((s) => s.setError);
  const reset = useCaptureStore((s) => s.reset);

  useEffect(() => {
    let unlistenImage: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    listen<CaptureImagePayload>('capture-image', async (event) => {
      try {
        const bitmap = await bytesToImageBitmap(event.payload.bytes);
        setScreenshot(bitmap);
        setOverlayVisible(false);
        reset();
        navigate('/');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
      }
    }).then((fn) => {
      unlistenImage = fn;
    });

    listen<CaptureErrorPayload>('capture-error', (event) => {
      setError(event.payload.message);
      setOverlayVisible(false);
    }).then((fn) => {
      unlistenError = fn;
    });

    return () => {
      unlistenImage?.();
      unlistenError?.();
    };
  }, [navigate, reset, setError, setOverlayVisible, setScreenshot]);
}

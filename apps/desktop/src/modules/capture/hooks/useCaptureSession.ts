import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/modules/editor/store';
import { persistCapture } from '@/modules/history/utils/persistCapture';
import { persistRecording } from '@/modules/history/utils/persistRecording';
import { saveRecordingFile } from '@/modules/history/utils/saveRecording';
import type {
  CaptureErrorPayload,
  CaptureImagePayload,
  CaptureProgressPayload,
  CaptureRecordingCompletePayload,
} from '@/shared/types/ipc';
import { bytesToImageBitmap } from '@/shared/utils/image';
import { hideCaptureOverlay, openPath, takeCaptureImage } from '@/tauri/commands';
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
    let unlistenRecording: (() => void) | undefined;

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
        const bytes = new Uint8Array(await takeCaptureImage());
        const bitmap = await bytesToImageBitmap(bytes);
        setScreenshot(bitmap);
        persistCapture({
          bytes,
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

    void listen<CaptureRecordingCompletePayload>('capture-recording-complete', async (event) => {
      try {
        setCaptureProgress(null);
        const payload = event.payload;
        const savedPath = await saveRecordingFile(
          payload.filePath,
          payload.format,
          `snapglow-recording.${payload.format}`
        );
        await persistRecording({
          sourcePath: payload.filePath,
          format: payload.format,
          width: payload.width,
          height: payload.height,
          thumbnailPng: payload.thumbnailPng,
        });
        await hideCaptureOverlay();
        setOverlayVisible(false);
        reset();
        // Open the finished recording in the OS default player so the user can
        // immediately watch it. Only when they actually chose a save location.
        if (savedPath) {
          await openPath(savedPath).catch(() => undefined);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlistenRecording = fn;
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
      unlistenRecording?.();
    };
  }, [navigate, reset, setCaptureProgress, setError, setOverlayVisible, setScreenshot]);
}

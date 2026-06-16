import { useCaptureStore } from '../store';

export function useCapture() {
  const isCapturing = useCaptureStore((s) => s.isCapturing);
  const overlayVisible = useCaptureStore((s) => s.overlayVisible);
  const activeMode = useCaptureStore((s) => s.activeMode);
  const error = useCaptureStore((s) => s.error);

  return {
    isCapturing,
    overlayVisible,
    activeMode,
    error,
  };
}

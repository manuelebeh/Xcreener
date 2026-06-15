import { useCaptureStore } from '../store';

export function useCapture() {
  const isCapturing = useCaptureStore((s) => s.isCapturing);
  const setCapturing = useCaptureStore((s) => s.setCapturing);

  return {
    isCapturing,
    startCapture: () => setCapturing(true),
    stopCapture: () => setCapturing(false),
  };
}

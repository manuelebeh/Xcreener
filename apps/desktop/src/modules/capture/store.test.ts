import { describe, expect, it } from 'vitest';
import { useCaptureStore } from '@/modules/capture/store';

describe('useCaptureStore', () => {
  it('resets capture state', () => {
    useCaptureStore.setState({
      overlayVisible: true,
      activeMode: 'window',
      error: 'failed',
      isCapturing: true,
    });

    useCaptureStore.getState().reset();

    expect(useCaptureStore.getState()).toMatchObject({
      overlayVisible: false,
      activeMode: 'idle',
      delaySecs: 0,
      liveOverlay: false,
      error: null,
      isCapturing: false,
      countdownSecs: null,
      scrollFrame: null,
      scrollFinishing: false,
      progressHudMode: false,
      captureProgress: null,
      previewUrl: null,
    });
  });
});

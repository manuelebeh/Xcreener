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
      mediaKind: 'photo',
      delaySecs: 0,
      liveOverlay: false,
      error: null,
      isCapturing: false,
      countdownSecs: null,
      scrollFrame: null,
      scrollFinishing: false,
      recordingFinishing: false,
      progressHudMode: false,
      recordingPaused: false,
      outputFormat: 'gif',
      captureProgress: null,
      previewUrl: null,
    });
  });
});

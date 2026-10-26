let captureImageListenerReady = false;

/** Lets the native E2E wait until `capture-image` has a listener: the event is not replayed. */
export function markCaptureImageListenerReady(): void {
  captureImageListenerReady = true;
}

export function isCaptureImageListenerReady(): boolean {
  return captureImageListenerReady;
}

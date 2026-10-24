import { invoke } from '@tauri-apps/api/core';
// Image bytes go as raw bodies (Uint8Array in, ArrayBuffer out), not JSON number arrays.

import type {
  CaptureMetadata,
  CaptureOverlayBounds,
  MonitorInfo,
  WindowInfo,
} from '@/shared/types/ipc';

export function captureRegion(x: number, y: number, width: number, height: number) {
  return invoke<ArrayBuffer>('capture_region', {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
}

export function captureWindow(windowId: number) {
  return invoke<ArrayBuffer>('capture_window', { windowId });
}

export function captureFullscreen(displayId: number) {
  return invoke<ArrayBuffer>('capture_fullscreen', { displayId });
}

export function listMonitors() {
  return invoke<MonitorInfo[]>('list_monitors_command');
}

export function listWindows() {
  return invoke<WindowInfo[]>('list_windows_command');
}

export function getWindowAtPoint(x: number, y: number) {
  return invoke<WindowInfo | null>('get_window_at_point_command', {
    x: Math.round(x),
    y: Math.round(y),
  });
}

export function getCaptureOverlayBounds() {
  return invoke<CaptureOverlayBounds>('get_capture_overlay_bounds');
}

export function showCaptureOverlay() {
  return invoke<CaptureOverlayBounds>('show_capture_overlay');
}

export function startCapture() {
  return invoke<void>('start_capture_command');
}

export function captureOverlayReady() {
  return invoke<void>('capture_overlay_ready');
}

export function getOverlayWebviewLayout() {
  return invoke<import('@/shared/types/ipc').OverlayWebviewLayout>('get_overlay_webview_layout');
}

export function hideCaptureOverlay() {
  return invoke<void>('hide_capture_overlay');
}

export function cancelCaptureOverlay() {
  return invoke<void>('cancel_capture_overlay');
}

export function captureNative(request: import('@/shared/types/ipc').CaptureNativeRequest) {
  return invoke<ArrayBuffer>('capture_native_command', { request });
}

export function captureScrollingWindow(window: import('@/shared/types/ipc').WindowInfo) {
  return invoke<ArrayBuffer>('capture_scrolling_window_command', { window });
}

/** Hands a finished capture to the main window, which reads it with takeCaptureImage. */
export function stashCaptureImage(bytes: Uint8Array) {
  return invoke<void>('stash_capture_image', bytes);
}

export function takeCaptureImage() {
  return invoke<ArrayBuffer>('take_capture_image');
}

export function cancelLiveCapture() {
  return invoke<void>('cancel_live_capture_command');
}

export function stopScrollingCapture() {
  return invoke<void>('stop_scrolling_capture_command');
}

export function startRegionRecording(
  request: import('@/shared/types/ipc').CaptureRecordStartRequest
) {
  return invoke<void>('start_region_recording_command', { request });
}

export function pauseRegionRecording() {
  return invoke<void>('pause_region_recording_command');
}

export function resumeRegionRecording() {
  return invoke<void>('resume_region_recording_command');
}

export function stopRegionRecording() {
  return invoke<import('@/shared/types/ipc').CaptureRecordingCompletePayload>(
    'stop_region_recording_command'
  );
}

export function cancelRegionRecording() {
  return invoke<void>('cancel_region_recording_command');
}

export function openPath(path: string) {
  return invoke<void>('open_path_command', { path });
}

export function showLiveCaptureOverlay() {
  return invoke<CaptureOverlayBounds>('show_live_capture_overlay');
}

export function detectSensitiveData(imageData: Uint8Array) {
  return invoke<import('@/shared/types/ipc').SensitiveRegion[]>('detect_sensitive_data', imageData);
}

/** Checks the API signature in Rust; null when the token is missing, forged or expired. */
export function verifyEntitlement(token: string) {
  return invoke<import('@/shared/types/ipc').Entitlement | null>('verify_entitlement', { token });
}

export function classifyContent(imageData: Uint8Array) {
  return invoke<import('@/shared/types/ipc').ClassificationResult>(
    'classify_content_command',
    imageData
  );
}

export function recognizeText(
  imageData: Uint8Array,
  options: import('@/shared/types/ipc').RecognizeTextOptions
) {
  return invoke<import('@/shared/types/ipc').TextLine[]>('recognize_text_command', imageData, {
    headers: { options: JSON.stringify(options) },
  });
}

export function analyzeContent(imageData: Uint8Array) {
  return invoke<import('@/shared/types/ipc').ContentAnalysis>('analyze_content_command', imageData);
}

export function compressExportBytes(imageData: Uint8Array, format: string, quality: number) {
  return invoke<ArrayBuffer>('compress_export_bytes_command', imageData, {
    headers: { format, quality: String(Math.round(quality)) },
  });
}

export function secureStoreGet(name: string) {
  return invoke<string | null>('secure_store_get', { name });
}

export function secureStoreSet(name: string, value: string) {
  return invoke<void>('secure_store_set', { name, value });
}

export function secureStoreDelete(name: string) {
  return invoke<void>('secure_store_delete', { name });
}

export type { CaptureMetadata };

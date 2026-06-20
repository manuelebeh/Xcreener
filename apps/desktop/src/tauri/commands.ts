import { invoke } from '@tauri-apps/api/core';
import type {
  CaptureMetadata,
  CaptureOverlayBounds,
  MonitorInfo,
  WindowInfo,
} from '@/shared/types/ipc';

export function captureRegion(x: number, y: number, width: number, height: number) {
  return invoke<number[]>('capture_region', {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  });
}

export function captureWindow(windowId: number) {
  return invoke<number[]>('capture_window', { windowId });
}

export function captureFullscreen(displayId: number) {
  return invoke<number[]>('capture_fullscreen', { displayId });
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

export function detectSensitiveData(imageData: number[]) {
  return invoke<import('@/shared/types/ipc').SensitiveRegion[]>('detect_sensitive_data', {
    imageData,
  });
}

export function classifyContent(imageData: number[]) {
  return invoke<import('@/shared/types/ipc').ClassificationResult>('classify_content_command', {
    imageData,
  });
}

export function exportImage(imageData: number[], format: string, quality: number, path: string) {
  return invoke<void>('export_image', { imageData, format, quality, path });
}

export function getSetting(key: string) {
  return invoke<string | null>('get_setting', { key });
}

export function setSetting(key: string, value: string) {
  return invoke<void>('set_setting', { key, value });
}

export type { CaptureMetadata };

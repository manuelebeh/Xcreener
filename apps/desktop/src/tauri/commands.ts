import { invoke } from '@tauri-apps/api/core';
import type { CaptureMetadata } from '@/shared/types/ipc';

export function captureRegion(x: number, y: number, width: number, height: number) {
  return invoke<number[]>('capture_region', { x, y, width, height });
}

export function captureWindow(windowId: number) {
  return invoke<number[]>('capture_window', { windowId });
}

export function captureFullscreen(displayId: number) {
  return invoke<number[]>('capture_fullscreen', { displayId });
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

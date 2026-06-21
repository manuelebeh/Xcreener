import type { CaptureMediaKind, CaptureTargetMode } from '@/shared/types/ipc';

export const PHOTO_TARGET_MODES: { id: CaptureTargetMode; label: string }[] = [
  { id: 'region', label: 'Region' },
  { id: 'window', label: 'Window' },
  { id: 'fullscreen', label: 'Screen' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'menu', label: 'Menu' },
];

export const VIDEO_TARGET_MODES: { id: CaptureTargetMode; label: string }[] = [
  { id: 'region', label: 'Region' },
  { id: 'window', label: 'Window' },
  { id: 'fullscreen', label: 'Screen' },
];

/** Video targets not yet wired to the recording backend (region-only MVP). */
export function isVideoTargetEnabled(mode: CaptureTargetMode): boolean {
  return mode === 'region';
}

export function targetModesForMediaKind(mediaKind: CaptureMediaKind) {
  return mediaKind === 'video' ? VIDEO_TARGET_MODES : PHOTO_TARGET_MODES;
}

export function defaultTargetForMediaKind(mediaKind: CaptureMediaKind): CaptureTargetMode {
  return 'region';
}

export function normalizeTargetForMediaKind(
  mode: CaptureTargetMode,
  mediaKind: CaptureMediaKind
): CaptureTargetMode {
  const allowed = targetModesForMediaKind(mediaKind).map((entry) => entry.id);
  if (allowed.includes(mode)) {
    return mode;
  }
  return defaultTargetForMediaKind(mediaKind);
}

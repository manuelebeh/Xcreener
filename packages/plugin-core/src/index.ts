import { type CollabDocumentState, defaultCollabDocumentState } from '@snapglow/collab-core';

export type { CollabDocumentState } from '@snapglow/collab-core';

/** Dark gradient preset for code editor captures (VS Code). */
export function buildCodeCaptureState(
  screenshotWidth: number,
  screenshotHeight: number
): CollabDocumentState {
  return {
    ...defaultCollabDocumentState(screenshotWidth, screenshotHeight),
    background: { type: 'gradient', presetId: 'midnight-code' },
    padding: 32,
    borderRadius: 8,
    shadow: {
      opacity: 0.45,
      blur: 32,
      offsetX: 0,
      offsetY: 12,
      color: '#000000',
    },
  };
}

/** Light preset for design tool captures (Figma). */
export function buildDesignCaptureState(
  screenshotWidth: number,
  screenshotHeight: number
): CollabDocumentState {
  return {
    ...defaultCollabDocumentState(screenshotWidth, screenshotHeight),
    background: { type: 'solid', color: '#f8f9fb' },
    padding: 48,
    borderRadius: 16,
    shadow: {
      opacity: 0.2,
      blur: 20,
      offsetX: 0,
      offsetY: 6,
      color: '#1a1a2e',
    },
  };
}

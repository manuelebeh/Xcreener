import { getPresetById } from '@snapglow/editor-core';
import { useMemo } from 'react';

import { type EditorScreenshot, useEditorStore } from '../store';

export interface MobileRenderInput {
  screenshot: EditorScreenshot;
  background: ReturnType<typeof useEditorStore.getState>['background'];
  padding: number;
  borderRadius: number;
  shadow: ReturnType<typeof useEditorStore.getState>['shadow'];
  frame: ReturnType<typeof getPresetById>;
  transform: ReturnType<typeof useEditorStore.getState>['transform'];
  annotations: ReturnType<typeof useEditorStore.getState>['annotations'];
  selectedAnnotationId: string | null;
}

export function useMobileRenderInput(): MobileRenderInput | null {
  const screenshot = useEditorStore((state) => state.screenshot);
  const padding = useEditorStore((state) => state.padding);
  const background = useEditorStore((state) => state.background);
  const borderRadius = useEditorStore((state) => state.borderRadius);
  const shadow = useEditorStore((state) => state.shadow);
  const selectedPresetId = useEditorStore((state) => state.selectedPresetId);
  const transform = useEditorStore((state) => state.transform);
  const annotations = useEditorStore((state) => state.annotations);
  const selectedAnnotationId = useEditorStore((state) => state.selectedAnnotationId);

  const frame = useMemo(
    () => (selectedPresetId ? getPresetById(selectedPresetId) : null),
    [selectedPresetId]
  );

  return useMemo(() => {
    if (!screenshot) {
      return null;
    }

    return {
      screenshot,
      background,
      padding,
      borderRadius,
      shadow,
      frame,
      transform,
      annotations,
      selectedAnnotationId,
    };
  }, [
    annotations,
    background,
    borderRadius,
    frame,
    padding,
    screenshot,
    selectedAnnotationId,
    shadow,
    transform,
  ]);
}

import { useCallback } from 'react';
import { captureRedactionTriggered } from '@/integrations/posthog/events';
import type { BlurAnnotation } from '@/modules/editor/annotations/types';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import type { RenderInput } from '@/modules/editor/types';
import { detectSensitiveData } from '@/tauri/commands';
import { useRedactionStore } from '../store';
import type { Detection } from '../types';
import { mapRegionToLayout } from '../utils/mapToLayout';
import { screenshotToPngBytes } from '../utils/screenshotToPngBytes';

function createDetectionId(): string {
  return crypto.randomUUID();
}

function buildRenderInput(): RenderInput | null {
  const state = useEditorStore.getState();
  if (!state.screenshot) {
    return null;
  }

  return {
    screenshot: state.screenshot,
    background: state.background,
    padding: state.padding,
    borderRadius: state.borderRadius,
    shadow: state.shadow,
    frame: getPresetById(state.selectedPresetId, state.customPresets),
    transform: state.transform,
    annotations: state.annotations,
    selectedAnnotationId: null,
  };
}

function detectionsToBlurAnnotations(detections: Detection[]): BlurAnnotation[] {
  const input = buildRenderInput();
  if (!input) {
    return [];
  }

  return detections.map((detection) => {
    const rect = mapRegionToLayout(detection, input);
    return {
      type: 'blur' as const,
      id: crypto.randomUUID(),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      mode: 'gaussian' as const,
      intensity: 12,
    };
  });
}

export function useRedactionScan() {
  const scan = useCallback(async () => {
    const screenshot = useEditorStore.getState().screenshot;
    if (!screenshot) {
      return;
    }

    const { setStatus, setDetections, setError, clear } = useRedactionStore.getState();
    clear();
    setStatus('scanning');

    try {
      const bytes = await screenshotToPngBytes(screenshot);
      const regions = await detectSensitiveData(bytes);
      const detections = regions.map((region) => ({
        ...region,
        id: createDetectionId(),
      }));
      setDetections(detections);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    }
  }, []);

  const maskAll = useCallback((auto = false) => {
    const detections = useRedactionStore.getState().detections;
    if (detections.length === 0) {
      return;
    }

    const editor = useEditorStore.getState();
    editor.pushHistory();
    for (const annotation of detectionsToBlurAnnotations(detections)) {
      editor.addAnnotation(annotation);
    }

    captureRedactionTriggered({
      auto_or_manual: auto ? 'auto' : 'manual',
      types_detected: [...new Set(detections.map((detection) => detection.kind))],
      count: detections.length,
    });

    useRedactionStore.getState().clear();
  }, []);

  const maskOne = useCallback((id: string) => {
    const detection = useRedactionStore.getState().detections.find((item) => item.id === id);
    if (!detection) {
      return;
    }

    const editor = useEditorStore.getState();
    editor.pushHistory();
    const [annotation] = detectionsToBlurAnnotations([detection]);
    if (annotation) {
      editor.addAnnotation(annotation);
    }

    captureRedactionTriggered({
      auto_or_manual: 'manual',
      types_detected: [detection.kind],
      count: 1,
    });

    useRedactionStore.getState().removeDetection(id);
  }, []);

  return { scan, maskAll, maskOne };
}

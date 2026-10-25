import type { BlurAnnotation } from '@xcreener/editor-core';
import { detectInLines, mapRegionToLayout, type TextLine } from '@xcreener/redaction-core';
import { useCallback } from 'react';
import { recognizeText } from 'xcreener-ocr';

import { useEditorStore } from '@/modules/editor/store';

import { useRedactionStore } from '../store';
import type { Detection } from '../types';

function createDetectionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectionsToBlurAnnotations(detections: Detection[]): BlurAnnotation[] {
  const input = useEditorStore.getState().buildRenderInput();
  if (!input) {
    return [];
  }

  return detections.map((detection) => {
    const rect = mapRegionToLayout(detection, input);
    return {
      type: 'blur' as const,
      id: createDetectionId(),
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      mode: 'gaussian' as const,
      intensity: 12,
    };
  });
}

function normalizeLines(lines: TextLine[]): TextLine[] {
  return lines.map((line) => ({
    text: line.text,
    x: Number(line.x),
    y: Number(line.y),
    width: Number(line.width),
    height: Number(line.height),
  }));
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
      const lines = normalizeLines(await recognizeText(screenshot.uri));
      const regions = detectInLines(lines);
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

    void auto;
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

    useRedactionStore.getState().removeDetection(id);
  }, []);

  return { scan, maskAll, maskOne };
}

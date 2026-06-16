import { useEffect, useRef } from 'react';
import { createAnnotationFromDrag, createTextAnnotation } from '../annotations/create';
import { getResizeAnchor, moveAnnotation, resizeAnnotation } from '../annotations/resize';
import type { Annotation, EditorTool, ResizeHandleId } from '../annotations/types';
import { isAnnotationTooSmall, isDrawTool } from '../annotations/utils';
import { computeLayout, zoomTransformAtPointer } from '../engine/computeLayout';
import { getResizeHandles, hitTestAnnotation, hitTestHandle } from '../engine/hitTest';
import { getPresetById } from '../engine/presets';
import { useEditorStore } from '../store';
import { displayToLayoutScale, logicalCanvasPointer } from './useCanvasCoordinates';

type InteractionMode = 'idle' | 'drawing' | 'moving' | 'resizing';

interface DraftState {
  annotation: Annotation;
  startX: number;
  startY: number;
}

export interface TextEditRequest {
  annotationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseAnnotationInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layoutWidth: number;
  layoutHeight: number;
  onTextEdit: (request: TextEditRequest) => void;
}

export function useAnnotationInteraction({
  canvasRef,
  layoutWidth,
  layoutHeight,
  onTextEdit,
}: UseAnnotationInteractionOptions): void {
  const modeRef = useRef<InteractionMode>('idle');
  const draftRef = useRef<DraftState | null>(null);
  const resizeHandleRef = useRef<ResizeHandleId | null>(null);
  const resizeAnchorRef = useRef({ x: 0, y: 0 });
  const moveStartRef = useRef({ x: 0, y: 0 });
  const selectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layoutWidth <= 0 || layoutHeight <= 0) {
      return;
    }

    const getPointer = (event: PointerEvent) =>
      logicalCanvasPointer(canvas, event.clientX, event.clientY, layoutWidth, layoutHeight);

    const setCursor = (tool: EditorTool) => {
      if (tool === 'move') {
        canvas.style.cursor = 'grab';
      } else if (tool === 'select') {
        canvas.style.cursor = 'default';
      } else if (tool === 'text') {
        canvas.style.cursor = 'text';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const state = useEditorStore.getState();
      if (!state.screenshot || state.activeTool === 'move') {
        return;
      }

      const pointer = getPointer(event);
      const { activeTool, annotations, selectedAnnotationId, toolDefaults } = state;

      if (activeTool === 'select') {
        if (event.detail >= 2) {
          const hit = hitTestAnnotation(annotations, pointer.x, pointer.y);
          if (hit?.type === 'text') {
            event.preventDefault();
            state.selectAnnotation(hit.id);
            requestAnimationFrame(() => {
              onTextEdit({
                annotationId: hit.id,
                x: hit.x,
                y: hit.y,
                width: Math.max(120, hit.text.length * hit.fontSize * 0.55),
                height: hit.fontSize * 1.4,
              });
            });
            return;
          }
        }

        if (selectedAnnotationId) {
          const selected = annotations.find((annotation) => annotation.id === selectedAnnotationId);
          if (selected) {
            const handles = getResizeHandles(selected);
            const handleId = hitTestHandle(handles, pointer.x, pointer.y);
            if (handleId) {
              modeRef.current = 'resizing';
              state.pushHistory();
              resizeHandleRef.current = handleId;
              resizeAnchorRef.current = getResizeAnchor(selected, handleId);
              selectedIdRef.current = selected.id;
              canvas.setPointerCapture(event.pointerId);
              return;
            }
          }
        }

        const hit = hitTestAnnotation(annotations, pointer.x, pointer.y);
        if (hit) {
          state.selectAnnotation(hit.id);
          modeRef.current = 'moving';
          state.pushHistory();
          moveStartRef.current = pointer;
          selectedIdRef.current = hit.id;
          canvas.setPointerCapture(event.pointerId);
          return;
        }

        state.selectAnnotation(null);
        return;
      }

      if (activeTool === 'text') {
        event.preventDefault();
        state.pushHistory();
        const textAnnotation = createTextAnnotation(toolDefaults, pointer.x, pointer.y);
        state.addAnnotation(textAnnotation);
        const editRequest: TextEditRequest = {
          annotationId: textAnnotation.id,
          x: textAnnotation.x,
          y: textAnnotation.y,
          width: 120,
          height: textAnnotation.fontSize * 1.4,
        };
        requestAnimationFrame(() => {
          onTextEdit(editRequest);
        });
        return;
      }

      if (isDrawTool(activeTool)) {
        const draft = createAnnotationFromDrag(
          activeTool,
          toolDefaults,
          pointer.x,
          pointer.y,
          pointer.x,
          pointer.y,
          { allowEmptySize: true }
        );
        if (!draft) {
          return;
        }
        state.pushHistory();
        modeRef.current = 'drawing';
        draftRef.current = { annotation: draft, startX: pointer.x, startY: pointer.y };
        state.setAnnotations([...annotations, draft]);
        state.selectAnnotation(draft.id);
        canvas.setPointerCapture(event.pointerId);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = useEditorStore.getState();
      const pointer = getPointer(event);

      if (modeRef.current === 'drawing' && draftRef.current) {
        const draft = draftRef.current;
        const updated = createAnnotationFromDrag(
          state.activeTool,
          state.toolDefaults,
          draft.startX,
          draft.startY,
          pointer.x,
          pointer.y
        );
        if (!updated) {
          return;
        }
        const nextAnnotation = { ...updated, id: draft.annotation.id };
        draftRef.current = { ...draft, annotation: nextAnnotation };
        state.setAnnotations(
          state.annotations.map((annotation) =>
            annotation.id === nextAnnotation.id ? nextAnnotation : annotation
          )
        );
        return;
      }

      if (modeRef.current === 'moving' && selectedIdRef.current) {
        const dx = pointer.x - moveStartRef.current.x;
        const dy = pointer.y - moveStartRef.current.y;
        moveStartRef.current = pointer;

        const selected = state.annotations.find(
          (annotation) => annotation.id === selectedIdRef.current
        );
        if (!selected) {
          return;
        }

        const moved = moveAnnotation(selected, dx, dy);
        state.updateAnnotation(selected.id, moved);
        return;
      }

      if (modeRef.current === 'resizing' && selectedIdRef.current && resizeHandleRef.current) {
        const selected = state.annotations.find(
          (annotation) => annotation.id === selectedIdRef.current
        );
        if (!selected) {
          return;
        }

        const resized = resizeAnnotation(
          selected,
          resizeHandleRef.current,
          pointer.x,
          pointer.y,
          resizeAnchorRef.current
        );
        state.updateAnnotation(selected.id, resized);
      }
    };

    const endInteraction = (event: PointerEvent) => {
      if (modeRef.current === 'drawing' && draftRef.current) {
        const state = useEditorStore.getState();
        const { annotation } = draftRef.current;
        if (isAnnotationTooSmall(annotation)) {
          state.removeAnnotation(annotation.id);
          state.selectAnnotation(null);
        }
      }

      modeRef.current = 'idle';
      draftRef.current = null;
      resizeHandleRef.current = null;
      selectedIdRef.current = null;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const updateCursorFromTool = () => {
      setCursor(useEditorStore.getState().activeTool);
    };

    updateCursorFromTool();
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.activeTool !== prev.activeTool) {
        updateCursorFromTool();
      }
    });

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', endInteraction);
    canvas.addEventListener('pointercancel', endInteraction);

    return () => {
      unsubscribe();
      canvas.style.cursor = '';
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endInteraction);
      canvas.removeEventListener('pointercancel', endInteraction);
    };
  }, [canvasRef, layoutWidth, layoutHeight, onTextEdit]);
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;

export function useScreenshotTransformEnabled(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean
): void {
  const screenshot = useEditorStore((s) => s.screenshot);
  const setTransform = useEditorStore((s) => s.setTransform);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenshot || !enabled) {
      return;
    }

    const draggingRef = { current: false };
    const lastPointerRef = { current: { x: 0, y: 0 } };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      draggingRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }

      const state = useEditorStore.getState();
      const frame = getPresetById(state.selectedPresetId, state.customPresets);
      const layout = computeLayout({
        screenshot,
        background: state.background,
        padding: state.padding,
        borderRadius: state.borderRadius,
        shadow: state.shadow,
        frame,
        transform: state.transform,
        annotations: state.annotations,
        selectedAnnotationId: state.selectedAnnotationId,
      });
      const scale = displayToLayoutScale(canvas, layout.canvasWidth);

      const dx = (event.clientX - lastPointerRef.current.x) * scale;
      const dy = (event.clientY - lastPointerRef.current.y) * scale;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };

      const current = state.transform;
      setTransform({
        offsetX: current.offsetX + dx,
        offsetY: current.offsetY + dy,
      });
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const state = useEditorStore.getState();
      const frame = getPresetById(state.selectedPresetId, state.customPresets);
      const transform = state.transform;
      const delta = -event.deltaY * ZOOM_SENSITIVITY;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale * (1 + delta)));

      if (nextScale === transform.scale) {
        return;
      }

      const layout = computeLayout({
        screenshot,
        background: state.background,
        padding: state.padding,
        borderRadius: state.borderRadius,
        shadow: state.shadow,
        frame,
        transform,
        annotations: state.annotations,
        selectedAnnotationId: state.selectedAnnotationId,
      });

      const pointer = logicalCanvasPointer(
        canvas,
        event.clientX,
        event.clientY,
        layout.canvasWidth,
        layout.canvasHeight
      );
      setTransform(zoomTransformAtPointer(layout, transform, pointer.x, pointer.y, nextScale));
    };

    const endDrag = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      draggingRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = 'grab';
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.style.cursor = '';
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [canvasRef, screenshot, enabled, setTransform]);
}

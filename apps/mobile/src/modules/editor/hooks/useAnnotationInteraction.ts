import {
  type Annotation,
  createAnnotationFromDrag,
  createTextAnnotation,
  type EditorTool,
  getResizeAnchor,
  getResizeHandles,
  hitTestAnnotation,
  hitTestHandle,
  isAnnotationTooSmall,
  isDrawTool,
  moveAnnotation,
  type ResizeHandleId,
  resizeAnnotation,
} from '@snapglow/editor-core';
import { useCallback, useRef } from 'react';
import { type GestureResponderEvent, PanResponder } from 'react-native';

import { useEditorStore } from '../store';
import { touchToLayout } from './useCanvasCoordinates';

export interface TextEditRequest {
  annotationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type InteractionMode = 'idle' | 'drawing' | 'moving' | 'resizing';

interface UseAnnotationInteractionOptions {
  layoutWidth: number;
  displayWidth: number;
  onTextEdit: (request: TextEditRequest) => void;
  enabled?: boolean;
}

export function useAnnotationInteraction({
  layoutWidth,
  displayWidth,
  onTextEdit,
  enabled = true,
}: UseAnnotationInteractionOptions) {
  const modeRef = useRef<InteractionMode>('idle');
  const draftRef = useRef<{ annotation: Annotation; startX: number; startY: number } | null>(null);
  const resizeHandleRef = useRef<ResizeHandleId | null>(null);
  const resizeAnchorRef = useRef({ x: 0, y: 0 });
  const moveStartRef = useRef({ x: 0, y: 0 });
  const selectedIdRef = useRef<string | null>(null);
  const lastTapRef = useRef(0);

  const getPointer = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      return touchToLayout(locationX, locationY, displayWidth, layoutWidth);
    },
    [displayWidth, layoutWidth]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled && layoutWidth > 0,
      onMoveShouldSetPanResponder: () => enabled && layoutWidth > 0,
      onPanResponderGrant: (event) => {
        if (!enabled || layoutWidth <= 0) {
          return;
        }

        const state = useEditorStore.getState();
        if (!state.screenshot || state.activeTool === 'move') {
          return;
        }

        const pointer = getPointer(event);
        const { activeTool, annotations, selectedAnnotationId, toolDefaults } = state;

        if (activeTool === 'select') {
          const now = Date.now();
          const isDoubleTap = now - lastTapRef.current < 300;
          lastTapRef.current = now;

          if (isDoubleTap) {
            const hit = hitTestAnnotation(annotations, pointer.x, pointer.y);
            if (hit?.type === 'text') {
              state.selectAnnotation(hit.id);
              onTextEdit({
                annotationId: hit.id,
                x: hit.x,
                y: hit.y,
                width: Math.max(120, hit.text.length * hit.fontSize * 0.55),
                height: hit.fontSize * 1.4,
              });
              return;
            }
          }

          if (selectedAnnotationId) {
            const selected = annotations.find((a) => a.id === selectedAnnotationId);
            if (selected) {
              const handleId = hitTestHandle(getResizeHandles(selected), pointer.x, pointer.y);
              if (handleId) {
                modeRef.current = 'resizing';
                state.pushHistory();
                resizeHandleRef.current = handleId;
                resizeAnchorRef.current = getResizeAnchor(selected, handleId);
                selectedIdRef.current = selected.id;
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
            return;
          }

          state.selectAnnotation(null);
          return;
        }

        if (activeTool === 'text') {
          state.pushHistory();
          const textAnnotation = createTextAnnotation(toolDefaults, pointer.x, pointer.y);
          state.addAnnotation(textAnnotation);
          onTextEdit({
            annotationId: textAnnotation.id,
            x: textAnnotation.x,
            y: textAnnotation.y,
            width: 120,
            height: textAnnotation.fontSize * 1.4,
          });
          return;
        }

        if (isDrawTool(activeTool)) {
          state.pushHistory();
          modeRef.current = 'drawing';
          const draft = createAnnotationFromDrag(
            activeTool,
            toolDefaults,
            pointer.x,
            pointer.y,
            pointer.x,
            pointer.y,
            { allowEmptySize: true }
          );
          if (draft) {
            draftRef.current = { annotation: draft, startX: pointer.x, startY: pointer.y };
            state.addAnnotation(draft);
          }
        }
      },
      onPanResponderMove: (event) => {
        const state = useEditorStore.getState();
        const pointer = getPointer(event);

        if (modeRef.current === 'drawing' && draftRef.current) {
          const { annotation, startX, startY } = draftRef.current;
          const updated = createAnnotationFromDrag(
            annotation.type as EditorTool,
            state.toolDefaults,
            startX,
            startY,
            pointer.x,
            pointer.y,
            { allowEmptySize: true }
          );
          if (updated) {
            state.updateAnnotation(annotation.id, updated);
            draftRef.current = { annotation: { ...updated, id: annotation.id }, startX, startY };
          }
          return;
        }

        if (modeRef.current === 'moving' && selectedIdRef.current) {
          const dx = pointer.x - moveStartRef.current.x;
          const dy = pointer.y - moveStartRef.current.y;
          const selected = state.annotations.find((a) => a.id === selectedIdRef.current);
          if (selected) {
            state.updateAnnotation(selected.id, moveAnnotation(selected, dx, dy));
          }
          moveStartRef.current = pointer;
          return;
        }

        if (modeRef.current === 'resizing' && selectedIdRef.current && resizeHandleRef.current) {
          const selected = state.annotations.find((a) => a.id === selectedIdRef.current);
          if (selected) {
            state.updateAnnotation(
              selected.id,
              resizeAnnotation(
                selected,
                resizeHandleRef.current,
                pointer.x,
                pointer.y,
                resizeAnchorRef.current
              )
            );
          }
        }
      },
      onPanResponderRelease: () => {
        const state = useEditorStore.getState();

        if (modeRef.current === 'drawing' && draftRef.current) {
          const { annotation } = draftRef.current;
          if (isAnnotationTooSmall(annotation)) {
            state.removeAnnotation(annotation.id);
          } else {
            state.commitHistory();
          }
        } else if (modeRef.current === 'moving' || modeRef.current === 'resizing') {
          state.commitHistory();
        }

        modeRef.current = 'idle';
        draftRef.current = null;
        resizeHandleRef.current = null;
        selectedIdRef.current = null;
      },
    })
  ).current;

  return panResponder.panHandlers;
}

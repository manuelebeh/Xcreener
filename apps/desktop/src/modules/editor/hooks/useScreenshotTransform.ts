import { useEffect, useRef } from 'react';
import { computeLayout, zoomTransformAtPointer } from '../engine/computeLayout';
import { getPresetById } from '../engine/presets';
import { useEditorStore } from '../store';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;

function displayToLayoutScale(canvas: HTMLCanvasElement, layoutWidth: number): number {
  const rect = canvas.getBoundingClientRect();
  return rect.width > 0 ? layoutWidth / rect.width : 1;
}

function logicalCanvasPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  layoutWidth: number,
  layoutHeight: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * layoutWidth,
    y: ((clientY - rect.top) / rect.height) * layoutHeight,
  };
}

export function useScreenshotTransform(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const setTransform = useEditorStore((s) => s.setTransform);

  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !screenshot) {
      return;
    }

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
  }, [canvasRef, screenshot, setTransform]);
}

import { useEffect, useRef } from 'react';
import { computeLayout } from '../engine/computeLayout';
import { renderFrame } from '../engine/renderFrame';
import { useEditorStore } from '../store';
import type { RenderInput } from '../types';

export function useBeautifyRender(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const background = useEditorStore((s) => s.background);
  const padding = useEditorStore((s) => s.padding);
  const borderRadius = useEditorStore((s) => s.borderRadius);
  const shadow = useEditorStore((s) => s.shadow);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!screenshot || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const render = () => {
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const input: RenderInput = {
        screenshot,
        background,
        padding,
        borderRadius,
        shadow,
      };

      const pixelRatio = window.devicePixelRatio || 1;
      const layout = computeLayout(input);

      canvas.width = Math.round(layout.canvasWidth * pixelRatio);
      canvas.height = Math.round(layout.canvasHeight * pixelRatio);
      canvas.style.width = `${layout.canvasWidth}px`;
      canvas.style.height = `${layout.canvasHeight}px`;

      renderFrame(context, input, pixelRatio);
    };

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      render();
      frameRef.current = null;
    });

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [screenshot, background, padding, borderRadius, shadow, canvasRef]);
}

import { useEffect, useRef } from 'react';
import { computeLayout } from '../engine/computeLayout';
import { renderFrame } from '../engine/renderFrame';
import type { RenderInput } from '../types';

export function useBeautifyRender(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  input: RenderInput | null
) {
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!input || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const render = () => {
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const pixelRatio = window.devicePixelRatio || 1;
      const layout = computeLayout(input);

      canvas.width = Math.round(layout.canvasWidth * pixelRatio);
      canvas.height = Math.round(layout.canvasHeight * pixelRatio);
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      renderFrame(context, input, pixelRatio, canvas);
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
  }, [input, canvasRef]);
}

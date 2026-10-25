import { useEffect, useRef } from 'react';
import { computeLayout } from '../engine/computeLayout';
import { renderFrame } from '../engine/renderFrame';
import type { RenderInput } from '../types';

export function useBeautifyRender(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  input: RenderInput | null,
  /** On-screen width of the canvas in CSS pixels; 0 while not mounted. */
  displayWidth: number
) {
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (displayWidth <= 0 || !input || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    const render = () => {
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const layout = computeLayout(input);
      // Size the backing store to the on-screen device pixels. Rendering at full export
      // size and letting CSS shrink it leaves the downscale to the compositor's cheap
      // filter, which blurs and aliases the screenshot.
      const pixelRatio = (displayWidth * (window.devicePixelRatio || 1)) / layout.canvasWidth;

      if (import.meta.env.DEV) {
        performance.mark('xcreener-render-start');
      }

      canvas.width = Math.round(layout.canvasWidth * pixelRatio);
      canvas.height = Math.round(layout.canvasHeight * pixelRatio);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      context.imageSmoothingQuality = 'high';

      renderFrame(context, input, pixelRatio, canvas);

      if (import.meta.env.DEV) {
        performance.mark('xcreener-render-end');
        performance.measure('xcreener-render', 'xcreener-render-start', 'xcreener-render-end');
      }
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
  }, [displayWidth, input, canvasRef]);
}

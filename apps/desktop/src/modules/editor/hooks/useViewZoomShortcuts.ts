import { useEffect, useRef } from 'react';
import { stepViewZoom } from '../engine/viewZoom';
import { useEditorStore } from '../store';

/** Cmd/Ctrl +, -, 1 (fit) and 0 (100%). `currentScale` is the on-screen scale right now. */
export function useViewZoomShortcuts(currentScale: number): void {
  const scaleRef = useRef(currentScale);
  scaleRef.current = currentScale;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return;
      }
      const { setViewZoom, screenshot } = useEditorStore.getState();
      if (!screenshot) {
        return;
      }

      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        setViewZoom(stepViewZoom(scaleRef.current, 'in') ?? scaleRef.current);
      } else if (event.key === '-') {
        event.preventDefault();
        setViewZoom(stepViewZoom(scaleRef.current, 'out') ?? scaleRef.current);
      } else if (event.key === '1') {
        event.preventDefault();
        setViewZoom(null);
      } else if (event.key === '0') {
        event.preventDefault();
        setViewZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

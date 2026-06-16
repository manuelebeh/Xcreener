import { useRef } from 'react';
import { useBeautifyRender } from '../hooks/useBeautifyRender';
import { useEditorStore } from '../store';

export function Canvas() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useBeautifyRender(canvasRef);

  return (
    <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl bg-surface">
      {screenshot ? (
        <canvas ref={canvasRef} data-testid="editor-canvas" className="max-h-[70vh] max-w-full" />
      ) : (
        <p className="text-sm text-muted">Capture a screenshot to start beautifying</p>
      )}
    </div>
  );
}

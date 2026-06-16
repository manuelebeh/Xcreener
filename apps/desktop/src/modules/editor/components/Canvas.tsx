import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store';

export function Canvas() {
  const padding = useEditorStore((s) => s.padding);
  const screenshot = useEditorStore((s) => s.screenshot);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!screenshot || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = screenshot.width;
    canvas.height = screenshot.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(screenshot, 0, 0);
  }, [screenshot]);

  return (
    <div
      className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl text-primary-foreground"
      style={{
        padding,
        background: screenshot ? 'var(--sg-color-surface)' : 'var(--sg-gradient-brand)',
      }}
    >
      {screenshot ? (
        <canvas
          ref={canvasRef}
          data-testid="editor-canvas"
          className="max-h-[70vh] max-w-full rounded-lg border border-border shadow-sm"
        />
      ) : (
        <p className="text-sm text-primary-foreground/90">Editor canvas placeholder</p>
      )}
    </div>
  );
}

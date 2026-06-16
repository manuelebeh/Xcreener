import { Button, Label, Slider, Tooltip, TooltipProvider } from '@snapglow/ui';
import type { Annotation, BlurMode, EditorTool } from '../annotations/types';
import { useEditorStore } from '../store';

const TOOLS: { id: EditorTool; label: string; short: string }[] = [
  { id: 'select', label: 'Select', short: 'Select' },
  { id: 'move', label: 'Move capture', short: 'Move' },
  { id: 'text', label: 'Text', short: 'Text' },
  { id: 'rect', label: 'Rectangle', short: 'Rect' },
  { id: 'ellipse', label: 'Ellipse', short: 'Oval' },
  { id: 'arrow', label: 'Arrow', short: 'Arrow' },
  { id: 'line', label: 'Line', short: 'Line' },
  { id: 'highlight', label: 'Highlight', short: 'Mark' },
  { id: 'blur', label: 'Blur', short: 'Blur' },
];

function SelectedAnnotationPanel({ annotation }: { annotation: Annotation }) {
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const updateToolDefaults = useEditorStore((s) => s.updateToolDefaults);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  if (annotation.type === 'text') {
    return (
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted">Font size</span>
          <input
            type="number"
            min={12}
            max={120}
            value={annotation.fontSize}
            onFocus={pushHistory}
            onChange={(event) => {
              updateAnnotation(annotation.id, { fontSize: Number(event.target.value) });
            }}
            className="sg-focus-ring block h-8 w-20 rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Color</span>
          <input
            type="color"
            value={annotation.color}
            onPointerDown={pushHistory}
            onChange={(event) => {
              updateAnnotation(annotation.id, { color: event.target.value });
              updateToolDefaults({ textColor: event.target.value });
            }}
            className="sg-focus-ring block h-8 w-12 cursor-pointer rounded-md border border-border"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted">Background</span>
          <input
            type="color"
            value={annotation.backgroundColor ?? '#ffffff'}
            onPointerDown={pushHistory}
            onChange={(event) => {
              updateAnnotation(annotation.id, { backgroundColor: event.target.value });
              updateToolDefaults({ textBackgroundColor: event.target.value });
            }}
            className="sg-focus-ring block h-8 w-12 cursor-pointer rounded-md border border-border"
          />
        </label>
      </div>
    );
  }

  if (annotation.type === 'highlight') {
    return (
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted">Color</span>
          <input
            type="color"
            value={annotation.color}
            onPointerDown={pushHistory}
            onChange={(event) => {
              updateAnnotation(annotation.id, { color: event.target.value });
              updateToolDefaults({ highlightColor: event.target.value });
            }}
            className="sg-focus-ring block h-8 w-12 cursor-pointer rounded-md border border-border"
          />
        </label>
        <div className="min-w-[160px] flex-1 space-y-1" onPointerDown={pushHistory}>
          <Label>Opacity</Label>
          <Slider
            min={0.1}
            max={0.8}
            step={0.05}
            value={[annotation.opacity]}
            onValueChange={(value) => updateAnnotation(annotation.id, { opacity: value[0] ?? 0.4 })}
          />
        </div>
      </div>
    );
  }

  if (annotation.type === 'blur') {
    return (
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <div className="flex gap-1">
          {(['gaussian', 'pixelate'] as BlurMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={annotation.mode === mode ? 'primary' : 'secondary'}
              onClick={() => {
                pushHistory();
                updateAnnotation(annotation.id, { mode });
                updateToolDefaults({ blurMode: mode });
              }}
            >
              {mode === 'gaussian' ? 'Gaussian' : 'Pixelate'}
            </Button>
          ))}
        </div>
        <div className="min-w-[160px] flex-1 space-y-1" onPointerDown={pushHistory}>
          <Label>Intensity</Label>
          <Slider
            min={2}
            max={40}
            step={1}
            value={[annotation.intensity]}
            onValueChange={(value) =>
              updateAnnotation(annotation.id, { intensity: value[0] ?? annotation.intensity })
            }
          />
        </div>
      </div>
    );
  }

  if (
    annotation.type === 'rect' ||
    annotation.type === 'ellipse' ||
    annotation.type === 'arrow' ||
    annotation.type === 'line'
  ) {
    return (
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted">Stroke</span>
          <input
            type="color"
            value={annotation.stroke}
            onPointerDown={pushHistory}
            onChange={(event) => {
              updateAnnotation(annotation.id, { stroke: event.target.value });
              updateToolDefaults({ stroke: event.target.value });
            }}
            className="sg-focus-ring block h-8 w-12 cursor-pointer rounded-md border border-border"
          />
        </label>
        <div className="min-w-[160px] flex-1 space-y-1" onPointerDown={pushHistory}>
          <Label>Width</Label>
          <Slider
            min={1}
            max={12}
            step={1}
            value={[annotation.strokeWidth]}
            onValueChange={(value) =>
              updateAnnotation(annotation.id, { strokeWidth: value[0] ?? annotation.strokeWidth })
            }
          />
        </div>
      </div>
    );
  }

  return null;
}

export function AnnotationToolbar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const annotations = useEditorStore((s) => s.annotations);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const toolDefaults = useEditorStore((s) => s.toolDefaults);
  const updateToolDefaults = useEditorStore((s) => s.updateToolDefaults);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);

  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  );

  if (!screenshot) {
    return null;
  }

  const toolbar = (
    <div className="w-full space-y-3" data-testid="annotation-toolbar">
      <div className="flex flex-wrap items-center gap-1.5">
        {!embedded ? <p className="mr-2 text-xs font-medium text-foreground">Annotations</p> : null}
        {TOOLS.map((tool) => (
          <Tooltip key={tool.id} content={tool.label}>
            <Button
              size="sm"
              variant={activeTool === tool.id ? 'primary' : 'secondary'}
              onClick={() => setActiveTool(tool.id)}
              aria-label={tool.label}
              className="whitespace-nowrap"
              data-testid={`annotation-tool-${tool.id}`}
            >
              {embedded ? tool.short : tool.label}
            </Button>
          </Tooltip>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={undo} disabled={history.past.length === 0}>
            Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={redo} disabled={history.future.length === 0}>
            Redo
          </Button>
        </div>
      </div>

      {activeTool === 'blur' && !selectedAnnotation ? (
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <div className="flex gap-1">
            {(['gaussian', 'pixelate'] as BlurMode[]).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={toolDefaults.blurMode === mode ? 'primary' : 'secondary'}
                onClick={() => updateToolDefaults({ blurMode: mode })}
              >
                {mode === 'gaussian' ? 'Gaussian' : 'Pixelate'}
              </Button>
            ))}
          </div>
          <div className="min-w-[160px] flex-1 space-y-1">
            <Label>Intensity</Label>
            <Slider
              min={2}
              max={40}
              step={1}
              value={[toolDefaults.blurIntensity]}
              onValueChange={(value) =>
                updateToolDefaults({ blurIntensity: value[0] ?? toolDefaults.blurIntensity })
              }
            />
          </div>
        </div>
      ) : null}

      {selectedAnnotation ? <SelectedAnnotationPanel annotation={selectedAnnotation} /> : null}
    </div>
  );

  if (embedded) {
    return <TooltipProvider>{toolbar}</TooltipProvider>;
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border bg-surface p-4">{toolbar}</div>
    </TooltipProvider>
  );
}

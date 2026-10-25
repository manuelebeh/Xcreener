import { Button, Label, Slider, Tooltip, TooltipProvider } from '@snapglow/ui';
import type { Annotation, BlurMode, EditorTool } from '../annotations/types';
import { useEditorStore } from '../store';
import { ToolIcon } from './ToolIcons';

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'move', label: 'Move capture' },
  { id: 'text', label: 'Text' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'line', label: 'Line' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'blur', label: 'Blur' },
];

function SelectedAnnotationPanel({ annotation }: { annotation: Annotation }) {
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);
  const updateToolDefaults = useEditorStore((s) => s.updateToolDefaults);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  if (annotation.type === 'text') {
    return (
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1.5 text-xs">
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
        <label className="space-y-1.5 text-xs">
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
        <label className="space-y-1.5 text-xs">
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
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1.5 text-xs">
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
        <div className="min-w-[160px] flex-1 space-y-1.5" onPointerDown={pushHistory}>
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
      <div className="flex flex-wrap items-end gap-4">
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
        <div className="min-w-[160px] flex-1 space-y-1.5" onPointerDown={pushHistory}>
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
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-1.5 text-xs">
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
        <div className="min-w-[160px] flex-1 space-y-1.5" onPointerDown={pushHistory}>
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

export function AnnotationToolStrip() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);

  if (!screenshot) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2" data-testid="annotation-toolbar">
        <div className="flex gap-0.5 rounded-md bg-foreground/[0.06] p-0.5">
          {TOOLS.map((tool) => (
            <Tooltip key={tool.id} content={tool.label} side="bottom">
              <button
                type="button"
                aria-label={tool.label}
                aria-pressed={activeTool === tool.id}
                data-testid={`annotation-tool-${tool.id}`}
                className={`sg-focus-ring flex h-7 w-8 items-center justify-center rounded-[5px] transition-colors ${
                  activeTool === tool.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-foreground/[0.08]'
                }`}
                onClick={() => setActiveTool(tool.id)}
              >
                <ToolIcon tool={tool.id} />
              </button>
            </Tooltip>
          ))}
        </div>
        <div className="ml-1 flex gap-0.5 border-l border-border pl-2">
          <Tooltip content="Undo" side="bottom">
            <button
              type="button"
              aria-label="Undo"
              className="sg-focus-ring flex h-7 w-8 items-center justify-center rounded-[5px] text-foreground transition-colors hover:bg-foreground/[0.08] disabled:pointer-events-none disabled:opacity-40"
              onClick={undo}
              disabled={history.past.length === 0}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 6 3.5 9.5 7 13M4 9.5h8.5a4 4 0 0 1 0 8H9" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip content="Redo" side="bottom">
            <button
              type="button"
              aria-label="Redo"
              className="sg-focus-ring flex h-7 w-8 items-center justify-center rounded-[5px] text-foreground transition-colors hover:bg-foreground/[0.08] disabled:pointer-events-none disabled:opacity-40"
              onClick={redo}
              disabled={history.future.length === 0}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 6l3.5 3.5L13 13M16 9.5H7.5a4 4 0 0 0 0 8H11" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

/** True when the blur tool or a selected shape has options to show; the inspector hides the section otherwise. */
export function useHasAnnotationOptions(): boolean {
  return useEditorStore(
    (s) =>
      s.screenshot !== null &&
      ((s.activeTool === 'blur' && s.selectedAnnotationId === null) ||
        s.annotations.some((annotation) => annotation.id === s.selectedAnnotationId))
  );
}

export function AnnotationToolbar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const activeTool = useEditorStore((s) => s.activeTool);
  const annotations = useEditorStore((s) => s.annotations);
  const selectedAnnotationId = useEditorStore((s) => s.selectedAnnotationId);
  const toolDefaults = useEditorStore((s) => s.toolDefaults);
  const updateToolDefaults = useEditorStore((s) => s.updateToolDefaults);

  const selectedAnnotation = annotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  );
  const showBlurDefaults = activeTool === 'blur' && !selectedAnnotation;

  if (!screenshot || (!showBlurDefaults && !selectedAnnotation)) {
    return null;
  }

  const toolbar = (
    <div className="w-full space-y-4" data-testid="annotation-options">
      {showBlurDefaults ? (
        <div className="flex flex-wrap items-end gap-4">
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
          <div className="min-w-[160px] flex-1 space-y-1.5">
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
    return toolbar;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{toolbar}</div>;
}

import { Button } from '@snapglow/ui';
import { useEditorStore } from '@/modules/editor/store';
import { Segmented } from '@/shared/components/Segmented';
import { useRedactionScan } from '../hooks/useRedactionScan';
import { useRedactionStore } from '../store';
import { REDACTION_CATEGORIES, type RedactionStyle } from '../types';

const STYLE_OPTIONS: { value: RedactionStyle['mode']; label: string }[] = [
  { value: 'gaussian', label: 'Blur' },
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'solid', label: 'Color' },
];

export function RedactionBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useRedactionStore((s) => s.status);
  const detections = useRedactionStore((s) => s.detections);
  const error = useRedactionStore((s) => s.error);
  const enabledKinds = useRedactionStore((s) => s.enabledKinds);
  const style = useRedactionStore((s) => s.style);
  const setKindsEnabled = useRedactionStore((s) => s.setKindsEnabled);
  const setStyle = useRedactionStore((s) => s.setStyle);
  const { scan, maskAll } = useRedactionScan();

  if (!screenshot) {
    return null;
  }

  const maskable = detections.filter((detection) => enabledKinds.includes(detection.kind));

  const content = (
    <div className="w-full space-y-3" data-testid="redaction-bar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={embedded ? 'text-xs text-foreground' : 'text-sm font-medium text-foreground'}
          >
            Sensitive data
          </p>
          {!embedded ? (
            <p className="text-xs text-muted">On-device OCR scan · 1-click masking</p>
          ) : null}
        </div>
        <span className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void scan()}
            disabled={status === 'scanning'}
            data-testid="redaction-scan-button"
          >
            {status === 'scanning' ? 'Scanning…' : 'Scan'}
          </Button>
          {maskable.length > 0 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => maskAll(false)}
              data-testid="redaction-mask-all-button"
            >
              Mask all ({maskable.length})
            </Button>
          ) : null}
        </span>
      </div>

      <fieldset className="m-0 space-y-1.5 border-0 p-0" data-testid="redaction-categories">
        <legend className="sr-only">What to mask</legend>
        {REDACTION_CATEGORIES.map((category) => {
          const checked = category.kinds.some((kind) => enabledKinds.includes(kind));
          const found = detections.filter((detection) =>
            category.kinds.includes(detection.kind)
          ).length;
          return (
            <label
              key={category.id}
              className="flex w-fit items-center gap-2 text-xs text-foreground"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setKindsEnabled(category.kinds, event.target.checked)}
                className="sg-focus-ring"
              />
              {category.label}
              {status === 'ready' ? <span className="text-muted">({found})</span> : null}
            </label>
          );
        })}
      </fieldset>

      <div className="flex items-center gap-2">
        <Segmented
          ariaLabel="How to mask"
          value={style.mode}
          options={STYLE_OPTIONS}
          onChange={(mode) => setStyle({ mode })}
          className="flex-1"
        />
        {style.mode === 'solid' ? (
          <input
            type="color"
            aria-label="Mask color"
            value={style.color}
            onChange={(event) => setStyle({ color: event.target.value })}
            className="sg-focus-ring h-7 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
            data-testid="redaction-color"
          />
        ) : null}
      </div>

      {status === 'ready' && detections.length === 0 ? (
        <p className="text-xs text-muted">No sensitive data detected.</p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" data-testid="redaction-error">
          {error}
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}

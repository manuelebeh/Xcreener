import { useEffect } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { SliderField } from '@/shared/components/SliderField';
import { useBalance } from '../hooks/useBalance';
import { useBalanceStore } from '../store';

export function BalanceBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useBalanceStore((s) => s.status);
  const error = useBalanceStore((s) => s.error);
  const balance = useBalanceStore((s) => s.balance);
  const analysis = useBalanceStore((s) => s.analysis);
  const inset = useBalanceStore((s) => s.inset);
  const insetColor = useBalanceStore((s) => s.insetColor);
  const { prepare, update } = useBalance();

  useEffect(() => {
    if (!screenshot) {
      useBalanceStore.getState().reset();
    } else if (screenshot !== useBalanceStore.getState().output) {
      void prepare(screenshot);
    }
  }, [prepare, screenshot]);

  if (!screenshot) {
    return null;
  }

  const content = (
    <div className="w-full space-y-4" data-testid="balance-bar">
      <SliderField
        label="Inset"
        readout={`${inset}px`}
        value={inset}
        min={0}
        max={200}
        disabled={status !== 'ready'}
        onChange={(next) => void update({ inset: next })}
      />

      <div className="flex items-center justify-between gap-2">
        <label htmlFor="balance-inset-color" className="text-xs text-foreground">
          Inset color
        </label>
        <input
          id="balance-inset-color"
          type="color"
          value={insetColor}
          disabled={inset === 0}
          onChange={(event) => void update({ insetColor: event.target.value })}
          className="sg-focus-ring h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-1">
        <label
          className="flex w-fit items-center gap-2 text-xs text-foreground"
          title="Centers the content by trimming every margin to the smallest one"
        >
          <input
            type="checkbox"
            checked={balance}
            disabled={!analysis}
            onChange={(event) => void update({ balance: event.target.checked })}
            className="sg-focus-ring size-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="balance-toggle"
          />
          Equal margins
          <span className="text-muted">· centers the content</span>
        </label>

        {status === 'analyzing' || (status === 'ready' && !analysis && !error) ? (
          <p className="text-xs text-muted" role="status">
            Detecting background…
          </p>
        ) : null}

        {error ? (
          <p className="text-xs text-muted" data-testid="balance-error">
            Equal margins unavailable for this capture: {error.toLowerCase()}.
          </p>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}

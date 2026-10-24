import { useEffect } from 'react';
import { useEditorStore } from '@/modules/editor/store';
import { useBalance } from '../hooks/useBalance';
import { useBalanceStore } from '../store';

export function BalanceBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const status = useBalanceStore((s) => s.status);
  const error = useBalanceStore((s) => s.error);
  const balance = useBalanceStore((s) => s.balance);
  const { prepare, apply } = useBalance();

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
    <div className="w-full space-y-1" data-testid="balance-bar">
      <label
        className="flex w-fit items-center gap-2 text-xs text-foreground"
        title="Centers the content by trimming every margin to the smallest one"
      >
        <input
          type="checkbox"
          checked={balance}
          disabled={status !== 'ready'}
          onChange={(event) => void apply(event.target.checked)}
          className="sg-focus-ring size-4 rounded border-border"
          data-testid="balance-toggle"
        />
        Equal margins
        <span className="text-muted">· centers the content</span>
      </label>

      {status === 'analyzing' ? (
        <p className="text-xs text-muted" role="status">
          Detecting background…
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-muted" data-testid="balance-error">
          Unavailable for this capture: {error.toLowerCase()}.
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}

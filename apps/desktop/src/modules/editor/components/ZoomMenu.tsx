import { Dropdown } from '@snapglow/ui';
import { stepViewZoom } from '../engine/viewZoom';
import { useEditorStore } from '../store';

interface ZoomMenuProps {
  /** On-screen scale right now (fit or explicit). */
  scale: number;
}

const ITEMS = [
  { label: 'Zoom In', value: 'in', hint: '⌘+' },
  { label: 'Zoom Out', value: 'out', hint: '⌘−' },
  { label: 'Zoom To Fit', value: 'fit', hint: '⌘1' },
  { label: '50%', value: '0.5' },
  { label: '100%', value: '1', hint: '⌘0' },
  { label: '200%', value: '2' },
];

export function ZoomMenu({ scale }: ZoomMenuProps) {
  const viewZoom = useEditorStore((s) => s.viewZoom);
  const setViewZoom = useEditorStore((s) => s.setViewZoom);

  const handleSelect = (value: string) => {
    if (value === 'in' || value === 'out') {
      setViewZoom(stepViewZoom(scale, value) ?? scale);
    } else if (value === 'fit') {
      setViewZoom(null);
    } else {
      setViewZoom(Number(value));
    }
  };

  return (
    <Dropdown
      items={ITEMS}
      onSelect={handleSelect}
      trigger={
        <button
          type="button"
          className="flex h-5 cursor-pointer items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs text-foreground tabular-nums transition-colors hover:bg-brand-100 data-[state=open]:bg-brand-100"
          aria-label="Zoom"
          data-testid="zoom-menu"
        >
          <span>
            {viewZoom === null ? 'Fit ' : ''}
            {Math.round(scale * 100)}%
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-2.5 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4.5 6 7.5l3-3" />
          </svg>
        </button>
      }
    />
  );
}

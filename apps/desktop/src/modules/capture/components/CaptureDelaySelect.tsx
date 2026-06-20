import type { CaptureDelaySecs } from '@/shared/types/ipc';

const DELAY_OPTIONS: { value: CaptureDelaySecs; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

interface CaptureDelaySelectProps {
  delaySecs: CaptureDelaySecs;
  onDelayChange: (delay: CaptureDelaySecs) => void;
  disabled?: boolean;
}

export function CaptureDelaySelect({
  delaySecs,
  onDelayChange,
  disabled = false,
}: CaptureDelaySelectProps) {
  return (
    <label className="capture-hud-btn flex cursor-pointer items-center gap-1 rounded-full px-2 py-1.5 text-sm">
      <span className="whitespace-nowrap opacity-80">Delay</span>
      <select
        data-testid="capture-delay-select"
        className="sg-focus-ring cursor-pointer rounded-md border-none bg-transparent text-sm outline-none"
        value={delaySecs}
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          onDelayChange(Number(event.target.value) as CaptureDelaySecs);
        }}
      >
        {DELAY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

import type { CaptureDelaySecs, CaptureMode } from '@/shared/types/ipc';
import { CaptureDelaySelect } from './CaptureDelaySelect';

interface CaptureToolbarProps {
  activeMode: CaptureMode;
  delaySecs: CaptureDelaySecs;
  isCapturing: boolean;
  onModeChange: (mode: CaptureMode) => void;
  onDelayChange: (delay: CaptureDelaySecs) => void;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

const MODES: { id: CaptureMode; label: string }[] = [
  { id: 'region', label: 'Region' },
  { id: 'window', label: 'Window' },
  { id: 'fullscreen', label: 'Screen' },
  { id: 'scroll', label: 'Scroll' },
  { id: 'menu', label: 'Menu' },
];

export function CaptureToolbar({
  activeMode,
  delaySecs,
  isCapturing,
  onModeChange,
  onDelayChange,
  onCancel,
  onConfirm,
  confirmDisabled = false,
}: CaptureToolbarProps) {
  return (
    <div
      data-testid="capture-toolbar"
      className="capture-hud pointer-events-auto flex cursor-default items-center gap-1 rounded-full border px-2 py-2 text-sm shadow-lg"
    >
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          data-testid={`capture-mode-${mode.id}`}
          className={`sg-focus-ring cursor-pointer rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
            activeMode === mode.id ? 'capture-hud-btn-active' : 'capture-hud-btn'
          }`}
          disabled={isCapturing}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onModeChange(mode.id);
          }}
        >
          {mode.label}
        </button>
      ))}
      <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
      <CaptureDelaySelect
        delaySecs={delaySecs}
        onDelayChange={onDelayChange}
        disabled={isCapturing || activeMode === 'scroll'}
      />
      {onConfirm ? (
        <>
          <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
          <button
            type="button"
            data-testid="capture-confirm"
            className="sg-focus-ring cursor-pointer rounded-full bg-primary px-3 py-1.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirmDisabled || isCapturing}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onConfirm();
            }}
          >
            Capture
          </button>
        </>
      ) : null}
      <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
      <button
        type="button"
        data-testid="capture-cancel"
        className="sg-focus-ring capture-hud-btn cursor-pointer rounded-full px-3 py-1.5 whitespace-nowrap transition-colors"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onCancel();
        }}
      >
        Cancel
      </button>
    </div>
  );
}

import type { CaptureMode } from '@/shared/types/ipc';

interface CaptureToolbarProps {
  activeMode: CaptureMode;
  onModeChange: (mode: CaptureMode) => void;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

const MODES: { id: CaptureMode; label: string }[] = [
  { id: 'region', label: 'Region' },
  { id: 'window', label: 'Window' },
  { id: 'fullscreen', label: 'Screen' },
];

export function CaptureToolbar({
  activeMode,
  onModeChange,
  onCancel,
  onConfirm,
  confirmDisabled = false,
}: CaptureToolbarProps) {
  return (
    <div
      data-testid="capture-toolbar"
      className="pointer-events-auto flex cursor-default items-center gap-1 rounded-full border border-white/20 bg-black/80 px-2 py-2 text-sm text-white shadow-lg backdrop-blur"
    >
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          data-testid={`capture-mode-${mode.id}`}
          className={`cursor-pointer rounded-full px-3 py-1.5 transition ${
            activeMode === mode.id ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10'
          }`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onModeChange(mode.id);
          }}
        >
          {mode.label}
        </button>
      ))}
      {onConfirm ? (
        <>
          <span className="mx-1 h-5 w-px bg-white/20" />
          <button
            type="button"
            data-testid="capture-confirm"
            className="cursor-pointer rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirmDisabled}
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
      <span className="mx-1 h-5 w-px bg-white/20" />
      <button
        type="button"
        data-testid="capture-cancel"
        className="cursor-pointer rounded-full px-3 py-1.5 text-white/80 transition hover:bg-white/10"
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

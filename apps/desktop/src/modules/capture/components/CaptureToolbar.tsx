import type {
  CaptureDelaySecs,
  CaptureGifQuality,
  CaptureMediaKind,
  CaptureMode,
  CaptureRecordOutputFormat,
} from '@/shared/types/ipc';
import { CaptureDelaySelect } from './CaptureDelaySelect';
import {
  isVideoTargetEnabled,
  targetModesForMediaKind,
} from '../utils/captureModes';

interface CaptureToolbarProps {
  mediaKind: CaptureMediaKind;
  activeMode: CaptureMode;
  delaySecs: CaptureDelaySecs;
  outputFormat: CaptureRecordOutputFormat;
  gifQuality: CaptureGifQuality;
  isCapturing: boolean;
  onMediaKindChange: (kind: CaptureMediaKind) => void;
  onModeChange: (mode: CaptureMode) => void;
  onDelayChange: (delay: CaptureDelaySecs) => void;
  onOutputFormatChange: (format: CaptureRecordOutputFormat) => void;
  onGifQualityChange: (quality: CaptureGifQuality) => void;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
}

const MEDIA_KINDS: { id: CaptureMediaKind; label: string }[] = [
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
];

const GIF_QUALITIES: { id: CaptureGifQuality; label: string; title: string }[] = [
  { id: 'low', label: 'SD', title: 'Lower quality, smallest file' },
  { id: 'medium', label: 'HD', title: 'Balanced quality and file size' },
  { id: 'high', label: 'Max', title: 'Highest quality, largest file' },
];

export function CaptureToolbar({
  mediaKind,
  activeMode,
  delaySecs,
  outputFormat,
  gifQuality,
  isCapturing,
  onMediaKindChange,
  onModeChange,
  onDelayChange,
  onOutputFormatChange,
  onGifQualityChange,
  onCancel,
  onConfirm,
  confirmDisabled = false,
}: CaptureToolbarProps) {
  const targetModes = targetModesForMediaKind(mediaKind);
  const isVideo = mediaKind === 'video';
  const confirmLabel = isVideo ? 'Start' : 'Capture';
  const delayDisabled = isCapturing || activeMode === 'scroll' || isVideo;

  return (
    <div
      data-testid="capture-toolbar"
      className="capture-hud pointer-events-auto flex cursor-default items-center gap-1 rounded-full border px-2 py-2 text-sm shadow-lg"
    >
      <fieldset className="flex items-center gap-1 border-0 p-0">
        <legend className="sr-only">Capture media</legend>
        {MEDIA_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            data-testid={`capture-media-${kind.id}`}
            className={`sg-focus-ring cursor-pointer rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
              mediaKind === kind.id ? 'capture-hud-btn-active' : 'capture-hud-btn'
            }`}
            disabled={isCapturing}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onMediaKindChange(kind.id);
            }}
          >
            {kind.label}
          </button>
        ))}
      </fieldset>
      <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
      {targetModes.map((mode) => {
        const disabled =
          isCapturing || (isVideo && !isVideoTargetEnabled(mode.id));
        return (
          <button
            key={mode.id}
            type="button"
            data-testid={`capture-mode-${mode.id}`}
            className={`sg-focus-ring rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
              activeMode === mode.id ? 'capture-hud-btn-active' : 'capture-hud-btn'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            disabled={disabled}
            title={isVideo && !isVideoTargetEnabled(mode.id) ? 'Coming soon' : undefined}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onModeChange(mode.id);
            }}
          >
            {mode.label}
          </button>
        );
      })}
      <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
      <CaptureDelaySelect
        delaySecs={delaySecs}
        onDelayChange={onDelayChange}
        disabled={delayDisabled}
      />
      {isVideo ? (
        <>
          <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
          <fieldset className="flex items-center gap-1 border-0 p-0">
            <legend className="sr-only">Recording format</legend>
            {(['gif', 'mp4'] as const).map((format) => (
              <button
                key={format}
                type="button"
                data-testid={`capture-format-${format}`}
                className={`sg-focus-ring cursor-pointer rounded-full px-2.5 py-1.5 text-xs uppercase transition-colors ${
                  outputFormat === format ? 'capture-hud-btn-active' : 'capture-hud-btn'
                }`}
                disabled={isCapturing}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onOutputFormatChange(format);
                }}
              >
                {format}
              </button>
            ))}
          </fieldset>
          {outputFormat === 'gif' ? (
            <>
              <span className="capture-hud-divider mx-1 h-5 w-px" aria-hidden="true" />
              <fieldset className="flex items-center gap-1 border-0 p-0">
                <legend className="sr-only">GIF quality</legend>
                {GIF_QUALITIES.map((quality) => (
                  <button
                    key={quality.id}
                    type="button"
                    data-testid={`capture-gif-quality-${quality.id}`}
                    title={quality.title}
                    className={`sg-focus-ring cursor-pointer rounded-full px-2.5 py-1.5 text-xs transition-colors ${
                      gifQuality === quality.id ? 'capture-hud-btn-active' : 'capture-hud-btn'
                    }`}
                    disabled={isCapturing}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onGifQualityChange(quality.id);
                    }}
                  >
                    {quality.label}
                  </button>
                ))}
              </fieldset>
            </>
          ) : null}
        </>
      ) : null}
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
            {confirmLabel}
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

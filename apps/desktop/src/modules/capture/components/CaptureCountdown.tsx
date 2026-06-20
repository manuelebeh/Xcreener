interface CaptureCountdownProps {
  remainingSecs: number;
}

export function CaptureCountdown({ remainingSecs }: CaptureCountdownProps) {
  return (
    <div
      data-testid="capture-countdown"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40"
    >
      <div className="rounded-2xl bg-black/70 px-8 py-6 text-center shadow-xl">
        <p className="text-sm uppercase tracking-wide text-white/70">Capturing in</p>
        <p className="mt-1 text-5xl font-semibold tabular-nums text-white">{remainingSecs}</p>
      </div>
    </div>
  );
}

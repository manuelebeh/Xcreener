import { useEffect, useRef, useState } from 'react';

/** Wall-clock elapsed seconds, excluding accumulated pause time. */
export function computeRecordingElapsedSecs(
  nowMs: number,
  startedAtMs: number,
  accumulatedPauseMs: number,
  paused: boolean,
  pauseStartedAtMs: number | null,
  maxDurationSecs?: number
): number {
  const activePauseMs =
    paused && pauseStartedAtMs != null ? nowMs - pauseStartedAtMs : 0;
  const elapsedMs = nowMs - startedAtMs - accumulatedPauseMs - activePauseMs;
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (maxDurationSecs != null) {
    return Math.min(seconds, maxDurationSecs);
  }
  return seconds;
}

/**
 * Smooth recording timer driven by wall clock + requestAnimationFrame.
 * Updates React state only when the displayed second changes (see ADR-007 / rAF pattern).
 */
export function useRecordingElapsed(
  active: boolean,
  paused: boolean,
  maxDurationSecs = 30,
  onMaxDurationReached?: () => void,
  anchorStartedAtMs?: number | null
): number {
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const startedAtMsRef = useRef<number | null>(null);
  const accumulatedPauseMsRef = useRef(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);
  const lastDisplayedSecRef = useRef(-1);
  const maxReachedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const onMaxRef = useRef(onMaxDurationReached);
  onMaxRef.current = onMaxDurationReached;

  useEffect(() => {
    if (!active) {
      startedAtMsRef.current = null;
      accumulatedPauseMsRef.current = 0;
      pauseStartedAtMsRef.current = null;
      lastDisplayedSecRef.current = -1;
      maxReachedRef.current = false;
      setElapsedSecs(0);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    if (anchorStartedAtMs != null) {
      startedAtMsRef.current = anchorStartedAtMs;
      return;
    }

    if (startedAtMsRef.current == null) {
      startedAtMsRef.current = Date.now();
    }
  }, [active, anchorStartedAtMs]);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (paused) {
      if (pauseStartedAtMsRef.current == null) {
        pauseStartedAtMsRef.current = Date.now();
      }
      return;
    }

    if (pauseStartedAtMsRef.current != null) {
      accumulatedPauseMsRef.current += Date.now() - pauseStartedAtMsRef.current;
      pauseStartedAtMsRef.current = null;
    }
  }, [active, paused]);

  useEffect(() => {
    if (!active || paused) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const startedAt = startedAtMsRef.current;
      if (startedAt == null) {
        return;
      }

      const seconds = computeRecordingElapsedSecs(
        Date.now(),
        startedAt,
        accumulatedPauseMsRef.current,
        false,
        null,
        maxDurationSecs
      );

      if (seconds !== lastDisplayedSecRef.current) {
        lastDisplayedSecRef.current = seconds;
        setElapsedSecs(seconds);
      }

      if (seconds >= maxDurationSecs) {
        if (!maxReachedRef.current) {
          maxReachedRef.current = true;
          onMaxRef.current?.();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, paused, maxDurationSecs]);

  return elapsedSecs;
}

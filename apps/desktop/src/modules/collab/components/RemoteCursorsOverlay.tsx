import { participantColor } from '@snapglow/collab-core';
import { useCollabStore } from '../store';

interface RemoteCursorsOverlayProps {
  layoutWidth: number;
  layoutHeight: number;
  displayScale: number;
  selfUserId?: string | null;
}

export function RemoteCursorsOverlay({
  layoutWidth,
  layoutHeight,
  displayScale,
  selfUserId,
}: RemoteCursorsOverlayProps) {
  const remoteCursors = useCollabStore((s) => s.remoteCursors);
  const connected = useCollabStore((s) => s.connected);

  if (!connected || layoutWidth <= 0 || layoutHeight <= 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {remoteCursors
        .filter((participant) => participant.userId !== selfUserId)
        .map((participant) => {
          if (participant.cursorX == null || participant.cursorY == null) {
            return null;
          }
          const left = participant.cursorX * layoutWidth * displayScale;
          const top = participant.cursorY * layoutHeight * displayScale;
          const color = participant.color || participantColor(participant.userId);
          return (
            <div
              key={participant.userId}
              className="absolute"
              style={{ left, top, transform: 'translate(-2px, -2px)' }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true">
                <path
                  d="M1 1 L1 14 L5 11 L8 18 L10 17 L7 10 L12 10 Z"
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1"
                />
              </svg>
              <span
                className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {participant.displayName ?? participant.email ?? 'Teammate'}
              </span>
            </div>
          );
        })}
    </div>
  );
}

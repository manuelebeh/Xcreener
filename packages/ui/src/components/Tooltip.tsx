import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { clsx } from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const HOVER_DELAY_MS = 800;

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={0} skipDelayDuration={0}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    },
    []
  );

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = undefined;
    }
  };

  const handlePointerEnter = () => {
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  };

  const handlePointerLeave = () => {
    clearHoverTimer();
    setOpen(false);
  };

  const handleFocus = () => {
    clearHoverTimer();
    setOpen(true);
  };

  const handleBlur = () => {
    clearHoverTimer();
    setOpen(false);
  };

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger
        asChild
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={clsx(
            'z-50 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-foreground" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

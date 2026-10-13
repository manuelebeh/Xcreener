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
          sideOffset={8}
          className={clsx(
            'sg-tooltip z-50 max-w-64 rounded-md border border-border bg-surface px-2 py-1',
            'text-xs leading-4 font-medium text-foreground',
            'shadow-[0_4px_14px_rgb(0_0_0/0.16),0_1px_2px_rgb(0_0_0/0.12)]',
            'motion-reduce:animate-none',
            className
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { focusRingClasses } from '../lib/focusRing';

export interface DropdownItem {
  label: string;
  value: string;
  /** Secondary text shown on the right, e.g. a size or shortcut. */
  hint?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect?: (value: string) => void;
  className?: string;
  /** When false, a click outside closes the menu and still reaches what was clicked. */
  modal?: boolean;
}

export function Dropdown({ trigger, items, onSelect, className, modal = true }: DropdownProps) {
  return (
    <DropdownMenuPrimitive.Root modal={modal}>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={clsx(
            'z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-md',
            className
          )}
          sideOffset={4}
        >
          {items.map((item) => (
            <DropdownMenuPrimitive.Item
              key={item.value}
              disabled={item.disabled}
              className={clsx(
                'relative flex cursor-pointer select-none items-center gap-4 rounded-sm px-2 py-1.5 text-sm',
                focusRingClasses,
                'focus:bg-brand-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              )}
              onSelect={() => onSelect?.(item.value)}
            >
              {item.label}
              {item.hint ? (
                <span className="ml-auto text-xs text-muted tabular-nums">{item.hint}</span>
              ) : null}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

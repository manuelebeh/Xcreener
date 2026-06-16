import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface DropdownItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect?: (value: string) => void;
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, className }: DropdownProps) {
  return (
    <DropdownMenuPrimitive.Root>
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
                'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'focus:bg-brand-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
              )}
              onSelect={() => onSelect?.(item.value)}
            >
              {item.label}
            </DropdownMenuPrimitive.Item>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

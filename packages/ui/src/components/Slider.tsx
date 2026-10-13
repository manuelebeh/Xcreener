import * as SliderPrimitive from '@radix-ui/react-slider';
import { clsx } from 'clsx';
import { focusRingClasses } from '../lib/focusRing';

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  className,
  value,
  defaultValue = [50],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={clsx('relative flex w-full touch-none select-none items-center', className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={clsx(
          'block size-4 cursor-grab rounded-full border border-black/10 bg-white active:cursor-grabbing',
          'shadow-[0_1px_3px_rgb(0_0_0/0.35),0_0_0_0.5px_rgb(0_0_0/0.08)]',
          focusRingClasses,
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      />
    </SliderPrimitive.Root>
  );
}

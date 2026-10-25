import { Slider } from '@xcreener/ui';

interface SliderFieldProps {
  label: string;
  /** Live value shown on the right, e.g. "40px". */
  readout: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function SliderField({
  label,
  readout,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: SliderFieldProps) {
  return (
    <fieldset className="mx-0 min-w-0 space-y-1.5 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex items-baseline justify-between gap-2">
        <span aria-hidden="true" className="text-xs text-foreground">
          {label}
        </span>
        <span className="text-xs text-muted tabular-nums">{readout}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([next]) => {
          if (next !== undefined) {
            onChange(next);
          }
        }}
      />
    </fieldset>
  );
}

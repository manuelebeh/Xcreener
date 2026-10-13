import { clsx } from 'clsx';

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <fieldset
      className={clsx(
        'm-0 flex min-w-0 gap-0.5 rounded-md border-0 bg-foreground/[0.06] p-0.5',
        className
      )}
    >
      <legend className="sr-only">{ariaLabel}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={clsx(
            'sg-focus-ring h-6 flex-1 rounded-[5px] px-2 text-xs font-medium whitespace-nowrap transition-colors',
            value === option.value
              ? 'bg-surface text-foreground shadow-[0_0_0_0.5px_var(--sg-color-border),0_1px_2px_rgb(0_0_0/0.12)]'
              : 'text-muted hover:text-foreground'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

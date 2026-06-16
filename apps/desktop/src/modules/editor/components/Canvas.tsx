import { useEditorStore } from '../store';

export function Canvas() {
  const padding = useEditorStore((s) => s.padding);

  return (
    <div
      className="flex min-h-[200px] flex-1 items-center justify-center rounded-xl text-primary-foreground"
      style={{
        padding,
        background: 'var(--sg-gradient-brand)',
      }}
    >
      Editor canvas placeholder
    </div>
  );
}

import { Button } from '@snapglow/ui';
import { NavLink } from 'react-router-dom';
import { useCaptureStore } from '@/modules/capture';
import { NotificationsBell } from '@/modules/collab/components/NotificationsBell';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { startCapture as invokeStartCapture } from '@/tauri/commands';

const NAV_ITEMS = [
  { to: '/', label: 'Editor', end: true },
  { to: '/history', label: 'Library', end: false },
  { to: '/settings', label: 'Settings', end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-[5px] px-3.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
    isActive
      ? 'bg-surface text-foreground shadow-[0_0_0_0.5px_var(--sg-color-border),0_1px_2px_rgb(0_0_0/0.12)]'
      : 'text-muted hover:text-foreground',
  ].join(' ');

async function startCapture() {
  try {
    await invokeStartCapture();
  } catch (error) {
    useCaptureStore.getState().setError(error instanceof Error ? error.message : String(error));
  }
}

export function AppTopNav() {
  return (
    <header className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-background px-4">
      <p className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-foreground">
        SnapGlow
      </p>

      <nav
        className="flex items-center gap-0.5 rounded-md bg-foreground/[0.06] p-0.5"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-1">
        {isTauriRuntime() ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => void startCapture()}>
            New capture
          </Button>
        ) : null}
        <NotificationsBell />
      </div>
    </header>
  );
}

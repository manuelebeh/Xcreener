import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Editor', end: true },
  { to: '/history', label: 'History', end: false },
  { to: '/settings', label: 'Settings', end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    isActive
      ? 'bg-background text-foreground shadow-sm'
      : 'text-muted hover:bg-background/60 hover:text-foreground',
  ].join(' ');

export function AppTopNav() {
  return (
    <header className="flex shrink-0 items-center gap-6 border-b border-border bg-surface px-4 py-3">
      <p className="font-display min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
        SnapGlow
      </p>

      <nav className="flex min-w-0 items-center gap-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

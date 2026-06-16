export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((then - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

export function formatCaptureDimensions(width: number, height: number): string {
  return `${width} × ${height}`;
}

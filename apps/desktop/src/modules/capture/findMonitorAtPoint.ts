import type { MonitorInfo } from '@/shared/types/ipc';

export function findMonitorAtPoint(
  monitors: MonitorInfo[],
  screenX: number,
  screenY: number
): MonitorInfo | null {
  return (
    monitors.find((monitor) => {
      const right = monitor.x + monitor.width;
      const bottom = monitor.y + monitor.height;
      return screenX >= monitor.x && screenX < right && screenY >= monitor.y && screenY < bottom;
    }) ?? null
  );
}

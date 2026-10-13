import { Button } from '@snapglow/ui';
import { useEffect, useState } from 'react';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api';
import { unreadNotificationCount, useCollabStore } from '../store';

export function NotificationsBell() {
  const notifications = useCollabStore((s) => s.notifications);
  const setNotifications = useCollabStore((s) => s.setNotifications);
  const markRead = useCollabStore((s) => s.markNotificationRead);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetchNotifications()
      .then(setNotifications)
      .catch((fetchError) => {
        useCollabStore
          .getState()
          .setStatusMessage(
            fetchError instanceof Error ? fetchError.message : 'Could not load notifications'
          );
      });
  }, [setNotifications]);

  const unread = unreadNotificationCount();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        className="sg-focus-ring relative flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8a5 5 0 0 1 10 0c0 4 1.5 5 1.5 5h-13S5 12 5 8Z" />
          <path d="M8.5 16a1.5 1.5 0 0 0 3 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">In-app notifications</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void markAllNotificationsRead().then(() =>
                  setNotifications(
                    notifications.map((item) => ({
                      ...item,
                      readAt: item.readAt ?? new Date().toISOString(),
                    }))
                  )
                );
              }}
            >
              Mark all read
            </Button>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="text-xs text-muted">No notifications yet</li>
            ) : (
              notifications.map((notification) => (
                <li key={notification.id} className="rounded border border-border/70 p-2 text-xs">
                  <p className="font-medium capitalize">{notification.type}</p>
                  <p className="text-muted">
                    {typeof notification.payload.body === 'string'
                      ? notification.payload.body
                      : JSON.stringify(notification.payload)}
                  </p>
                  {!notification.readAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1"
                      onClick={() => {
                        void markNotificationRead(notification.id).then(() =>
                          markRead(notification.id)
                        );
                      }}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

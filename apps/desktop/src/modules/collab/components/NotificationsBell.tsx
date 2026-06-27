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
      .catch(() => {
        // ignore when signed out
      });
  }, [setNotifications]);

  const unread = unreadNotificationCount();

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
        Notifications{unread > 0 ? ` (${unread})` : ''}
      </Button>
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

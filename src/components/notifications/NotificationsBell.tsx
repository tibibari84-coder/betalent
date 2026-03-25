'use client';

import { useState, useRef, useEffect } from 'react';
import { IconBell } from '@/components/ui/Icons';
import NotificationsDropdown, { type NotificationItem } from './NotificationsDropdown';

export default function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (): Promise<NotificationItem[]> => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.ok && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        return data.notifications as NotificationItem[];
      }
      return [];
    } catch {
      setNotifications([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      fetchNotifications().then(async (rows) => {
        const unreadIds = rows.filter((n) => !n.isRead).map((n) => n.id);
        if (unreadIds.length > 0) {
          await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAll: true, notificationIds: unreadIds }),
          }).catch(() => {});
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })));
        }
      });
    }
  };

  const handleNotificationOpen = async (item: NotificationItem) => {
    if (item.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: item.id }),
    }).catch(() => {});
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative shrink-0 min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="
          flex items-center justify-center shrink-0 relative
          h-9 w-9 min-h-9 min-w-9
          rounded-[10px]
          text-white/80 hover:text-white/95 hover:bg-white/[0.06]
          hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-150 ease-out
          focus:outline-none focus:ring-2 focus:ring-white/10 focus:ring-offset-2 focus:ring-offset-transparent
        "
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <IconBell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 min-w-[14px] h-[14px] px-1 rounded-full bg-[#B11226] text-[9px] font-semibold text-white flex items-center justify-center leading-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-[100]">
          <NotificationsDropdown
            notifications={loading ? [] : notifications}
            onClose={() => setIsOpen(false)}
            onNotificationOpen={handleNotificationOpen}
          />
        </div>
      )}
    </div>
  );
}

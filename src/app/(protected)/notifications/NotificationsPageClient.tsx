'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconBell } from '@/components/ui/Icons';
import type { NotificationItem } from '@/components/notifications/NotificationsDropdown';

export default function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.notifications)) {
          const rows = data.notifications as NotificationItem[];
          setNotifications(rows);
          const unreadIds = rows.filter((n) => !n.isRead).map((n) => n.id);
          if (unreadIds.length > 0) {
            fetch('/api/notifications/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ markAll: true, notificationIds: unreadIds }),
            }).catch(() => {});
            setNotifications((prev) =>
              prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }))
            );
          }
        }
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-[20px]"
        style={{
          background: 'rgba(26,26,28,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-[15px] text-text-muted">Loading notifications...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-[20px]"
        style={{
          background: 'rgba(26,26,28,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <IconBell className="w-14 h-14 text-text-muted mb-4 opacity-40" />
        <p className="text-[16px] text-text-secondary mb-2">No notifications yet</p>
        <p className="text-[14px] text-text-muted">When you get votes, comments, mentions, followers, or gifts, they&apos;ll show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {notifications.map((item) => (
        <NotificationCard key={item.id} item={item} onOpen={() => {
          if (item.isRead) return;
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
          );
          fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: item.id }),
          }).catch(() => {});
        }} />
      ))}
    </div>
  );
}

function NotificationCard({ item, onOpen }: { item: NotificationItem; onOpen?: () => void }) {
  const content = (
    <div
      className={`flex items-start gap-4 p-4 rounded-[18px] min-h-[72px] transition-colors hover:bg-white/[0.03] ${
        item.isRead ? 'opacity-85' : ''
      }`}
      style={{
        background: 'rgba(26,26,28,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="w-12 h-12 rounded-full bg-canvas-tertiary flex items-center justify-center text-text-muted font-semibold shrink-0">
        {item.actorName?.charAt(0) ?? '•'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-text-primary leading-snug">{item.message}</p>
        <p className="text-[13px] text-text-muted mt-1.5">{item.timestamp}</p>
      </div>
      {!item.isRead && <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-accent shrink-0" aria-hidden />}
    </div>
  );

  if (item.href) {
    return <Link href={item.href} className="block" onClick={onOpen}>{content}</Link>;
  }
  return <div onClick={onOpen}>{content}</div>;
}

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { IconBell } from '@/components/ui/Icons';

export interface NotificationItem {
  id: string;
  type: 'follow' | 'vote' | 'challenge' | 'qualify' | 'comment' | 'gift' | 'security';
  message: string;
  avatarUrl?: string;
  actorName?: string;
  timestamp: string;
  href?: string;
  recipientId?: string;
  actorId?: string;
  relatedVideoId?: string;
  relatedGiftId?: string;
  createdAt?: string;
  isRead?: boolean;
  readAt?: string | null;
}

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
  onClose?: () => void;
  onNotificationOpen?: (item: NotificationItem) => void;
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: NotificationItem;
  onOpen?: (item: NotificationItem) => void;
}) {
  const content = (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded-xl transition-all duration-150 ease-out hover:bg-white/[0.06] active:bg-white/[0.09] active:scale-[0.97] ${
        item.isRead ? 'opacity-85' : ''
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-white/[0.08] ring-1 ring-white/[0.1] flex items-center justify-center text-[11px] text-text-muted font-semibold shrink-0">
        {item.actorName?.charAt(0) ?? '•'}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[12px] text-text-primary leading-snug line-clamp-2 break-words">
          {item.message}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5 truncate tabular-nums">
          {item.timestamp}
        </p>
      </div>
      {!item.isRead && (
        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        <span onClick={() => onOpen?.(item)}>{content}</span>
      </Link>
    );
  }
  return <div onClick={() => onOpen?.(item)}>{content}</div>;
}

export default function NotificationsDropdown({
  notifications,
  onClose,
  onNotificationOpen,
}: NotificationsDropdownProps) {
  return (
    <div
      className="w-full max-h-[min(54svh,340px)] overflow-hidden flex flex-col rounded-2xl p-2"
      style={{
        background: 'rgba(20,20,24,0.7)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-2 px-1.5 py-1 mb-1">
        <h3 className="font-display text-[13px] font-semibold text-text-primary truncate">
          Notifications
        </h3>
        <Link
          href="/notifications"
          className="shrink-0 text-[11px] font-medium text-accent hover:text-accent-hover py-0.5"
          onClick={onClose}
        >
          See all
        </Link>
      </div>
      <div className="relative flex-1 min-h-0">
        <div className="overflow-y-auto h-full space-y-0.5 pr-0.5">
        {notifications.length === 0 ? (
          <div className="py-8 text-center px-2">
            <IconBell className="w-7 h-7 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-[12px] text-text-secondary">No notifications yet</p>
          </div>
        ) : (
          notifications.map((item) => (
            <NotificationRow key={item.id} item={item} onOpen={onNotificationOpen} />
          ))
        )}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
          style={{ background: 'linear-gradient(to top, rgba(20,20,24,0.88), rgba(20,20,24,0))' }}
          aria-hidden
        />
      </div>
    </div>
  );
}

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
      className={`flex items-start gap-3 p-3 rounded-[14px] min-h-[68px] transition-colors hover:bg-white/[0.04] ${
        item.isRead ? 'opacity-85' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-canvas-tertiary flex items-center justify-center text-text-muted font-semibold shrink-0">
        {item.actorName?.charAt(0) ?? '•'}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[13px] text-text-primary leading-snug line-clamp-2 break-words">{item.message}</p>
        <p className="text-[12px] text-text-muted mt-1 truncate">{item.timestamp}</p>
      </div>
      {!item.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden />}
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
      className="w-full max-h-[min(62svh,460px)] sm:max-h-[520px] overflow-hidden flex flex-col rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-3"
      style={{
        background: 'rgba(26,26,28,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center justify-between px-2 py-1.5 sm:py-2 mb-1">
        <h3 className="font-display text-[15px] sm:text-[16px] font-semibold text-text-primary">Notifications</h3>
        <Link
          href="/notifications"
          className="text-[12px] sm:text-[13px] font-medium text-accent hover:text-accent-hover"
          onClick={onClose}
        >
          See all
        </Link>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 space-y-1">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <IconBell className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-[14px] text-text-secondary">No notifications yet</p>
          </div>
        ) : (
          notifications.map((item) => (
            <NotificationRow key={item.id} item={item} onOpen={onNotificationOpen} />
          ))
        )}
      </div>
    </div>
  );
}

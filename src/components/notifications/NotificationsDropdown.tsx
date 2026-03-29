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
      className={`flex items-start gap-2 sm:gap-2.5 md:gap-3 px-2 py-2 sm:px-2.5 sm:py-2.5 md:p-3 rounded-[12px] sm:rounded-[14px] transition-colors hover:bg-white/[0.04] active:bg-white/[0.06] ${
        item.isRead ? 'opacity-85' : ''
      }`}
    >
      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-canvas-tertiary flex items-center justify-center text-[11px] sm:text-xs md:text-sm text-text-muted font-semibold shrink-0">
        {item.actorName?.charAt(0) ?? '•'}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden py-0.5 sm:py-0">
        <p className="text-[12px] sm:text-[13px] text-text-primary leading-tight sm:leading-snug line-clamp-2 break-words">
          {item.message}
        </p>
        <p className="text-[10px] sm:text-[11px] md:text-[12px] text-text-muted mt-0.5 sm:mt-1 truncate tabular-nums">
          {item.timestamp}
        </p>
      </div>
      {!item.isRead && (
        <span className="mt-1 sm:mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent shrink-0" aria-hidden />
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
      className="w-full max-h-[min(52svh,360px)] sm:max-h-[min(62svh,460px)] md:max-h-[520px] overflow-hidden flex flex-col rounded-[14px] sm:rounded-[16px] md:rounded-[20px] p-2 sm:p-2.5 md:p-3"
      style={{
        background: 'rgba(26,26,28,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      }}
    >
      <div className="flex items-center justify-between gap-2 px-1 sm:px-1.5 md:px-2 py-1 sm:py-1.5 mb-0.5 sm:mb-1">
        <h3 className="font-display text-[14px] sm:text-[15px] md:text-[16px] font-semibold text-text-primary truncate">
          Notifications
        </h3>
        <Link
          href="/notifications"
          className="shrink-0 text-[11px] sm:text-[12px] md:text-[13px] font-medium text-accent hover:text-accent-hover py-0.5"
          onClick={onClose}
        >
          See all
        </Link>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 space-y-0 sm:space-y-0.5">
        {notifications.length === 0 ? (
          <div className="py-8 sm:py-10 md:py-12 text-center px-2">
            <IconBell className="w-8 h-8 sm:w-10 sm:h-10 text-text-muted mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-[13px] sm:text-[14px] text-text-secondary">No notifications yet</p>
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

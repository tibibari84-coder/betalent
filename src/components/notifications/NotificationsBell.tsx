'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconBell } from '@/components/ui/Icons';
import NotificationsDropdown, { type NotificationItem } from './NotificationsDropdown';

type NotificationsBellProps = {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type BellPanelState = { open: false } | { open: true; top: number; left: number; width: number };

const PANEL_Z = 560;
/** Wider than profile menu — notification copy needs more horizontal room. */
const PANEL_WIDTH_MOBILE_MAX = 340;
const PANEL_WIDTH_DESKTOP = 380;

export default function NotificationsBell({ isOpen: controlledOpen, onOpenChange }: NotificationsBellProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<BellPanelState>({ open: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = controlledOpen ?? uncontrolledOpen;

  const setOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    if (controlledOpen === undefined) setUncontrolledOpen(open);
  };

  function getPanelWidth() {
    if (typeof window === 'undefined') return PANEL_WIDTH_DESKTOP;
    if (window.innerWidth < 640) {
      return Math.min(window.innerWidth - 20, PANEL_WIDTH_MOBILE_MAX);
    }
    return PANEL_WIDTH_DESKTOP;
  }

  /**
   * Left-align panel to bell trigger (distinct from profile menu, which is right-anchored to avatar).
   * Clamp so the panel stays in the viewport.
   */
  function getBellLeftAnchoredLeft(r: DOMRect, width: number) {
    const edge = 10;
    const preferred = r.left;
    const maxLeft = Math.max(edge, window.innerWidth - width - edge);
    return Math.max(edge, Math.min(preferred, maxLeft));
  }

  function updateAnchor() {
    const btn = triggerRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = getPanelWidth();
    setPanel({ open: true, top: r.bottom + 8, left: getBellLeftAnchoredLeft(r, width), width });
  }

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpen = () => {
    const next = !isOpen;
    setOpen(next);
    if (next) {
      updateAnchor();
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

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateAnchor();
    const onScrollOrResize = () => updateAnchor();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    let frame = 0;
    frame = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', onPointerDown);
    });
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0 min-w-0" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="
          flex items-center justify-center shrink-0 relative
          h-[var(--utility-btn-size)] w-[var(--utility-btn-size)] min-h-[var(--utility-btn-size)] min-w-[var(--utility-btn-size)]
          rounded-[10px]
          text-white/80 hover:text-white/95 hover:bg-white/[0.06]
          hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-150 ease-out
          focus:outline-none focus:ring-2 focus:ring-white/10 focus:ring-offset-2 focus:ring-offset-transparent
        "
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <IconBell className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)]" />
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 min-w-[14px] h-[14px] px-1 rounded-full bg-[#B11226] text-[9px] font-semibold text-white flex items-center justify-center leading-none"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && panel.open && mounted
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="premium-dropdown-enter fixed overflow-hidden pointer-events-auto origin-top-left"
              style={{
                top: panel.top,
                left: panel.left,
                width: panel.width,
                maxWidth: 'min(calc(100vw - 20px), 380px)',
                zIndex: PANEL_Z,
              }}
            >
              <NotificationsDropdown
                notifications={loading ? [] : notifications}
                onClose={() => setOpen(false)}
                onNotificationOpen={(item) => {
                  void handleNotificationOpen(item);
                  setOpen(false);
                }}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

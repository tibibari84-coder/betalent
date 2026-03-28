'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconChat, IconSearch } from '@/components/ui/Icons';
import { inboxThreadPath } from '@/lib/chat-navigation';

type Conversation = {
  conversationId: string;
  peer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  mutualFollow: boolean;
  priorConsent: boolean;
  canMessage: boolean;
};

type FilterKey = 'all' | 'unread' | 'requests' | 'following';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'requests', label: 'Requests' },
  { key: 'following', label: 'Following' },
];

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / min))}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function InboxPageClient() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchOpen, setSearchOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.conversations)) {
        setItems(data.conversations as Conversation[]);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (activeFilter === 'unread' && c.unreadCount <= 0) return false;
      if (activeFilter === 'requests' && c.canMessage) return false;
      if (activeFilter === 'following' && !c.mutualFollow) return false;
      if (!q) return true;
      const n = (c.peer.displayName || '').toLowerCase();
      const u = (c.peer.username || '').toLowerCase();
      const p = (c.lastMessagePreview || '').toLowerCase();
      return n.includes(q) || u.includes(q) || p.includes(q);
    });
  }, [items, query, activeFilter]);

  const showMainEmpty = !loading && items.length === 0;
  const showFilterEmpty = !loading && items.length > 0 && filtered.length === 0;

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-none flex-col overflow-x-hidden bg-[#050505]">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -15%, rgba(196,18,47,0.14), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(130,30,52,0.1), transparent 60%)',
        }}
      />

      <div
        className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))] sm:px-4"
      >
        <header className="shrink-0 border-b border-white/[0.06] bg-[#050505]/95 backdrop-blur-md">
          <div className="flex items-center justify-between py-2">
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-white sm:text-[24px]">Inbox</h1>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Toggle inbox search"
            >
              <IconSearch className="h-5 w-5" />
            </button>
          </div>
          {searchOpen ? (
            <div className="pb-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search conversations"
                className="h-[48px] w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 text-[16px] text-white placeholder:text-white/40 focus:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
          ) : null}
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`h-10 shrink-0 rounded-full border px-4 text-[13px] font-medium whitespace-nowrap transition-colors touch-manipulation ${
                  activeFilter === f.key
                    ? 'border-accent/40 bg-accent/20 text-accent'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/65 hover:text-white/90'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <ul className="space-y-2 pt-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[72px] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.04]"
                />
              ))}
            </ul>
          ) : showMainEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08]">
                <IconChat className="h-8 w-8 text-white/40" />
              </div>
              <h2 className="text-[18px] font-semibold text-white">No conversations yet</h2>
              <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-white/45">
                Your messages will appear here when you start interacting.
              </p>
              <Link
                href="/feed"
                className="mt-8 inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-2xl bg-accent px-8 text-[15px] font-semibold text-white transition-opacity hover:opacity-95 active:scale-[0.99]"
              >
                Go to Feed
              </Link>
            </div>
          ) : showFilterEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-[16px] font-semibold text-white/90">
                {activeFilter === 'requests'
                  ? 'No message requests'
                  : activeFilter === 'unread'
                    ? 'No unread messages'
                    : activeFilter === 'following'
                      ? 'No chats with mutual follows'
                      : 'Nothing matches'}
              </p>
              <p className="mt-2 max-w-xs text-[13px] text-white/45">
                {activeFilter === 'requests'
                  ? 'When someone you don’t mutually follow reaches out, it shows here.'
                  : 'Try another tab or clear search.'}
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-1 [-webkit-overflow-scrolling:touch]">
              {filtered.map((c) => {
                const displayName = c.peer.displayName || `@${c.peer.username}`;
                const href = inboxThreadPath(c.peer.id);
                return (
                  <li key={c.conversationId} className="border-b border-white/[0.06] last:border-0">
                    <Link
                      href={href}
                      className="flex min-h-[56px] items-center gap-3 py-3.5 transition-colors active:bg-white/[0.04]"
                    >
                      <div className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08]">
                        {c.peer.avatarUrl ? (
                          <img src={c.peer.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
                        ) : (
                          <span className="text-[15px] font-semibold text-white/80">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-[16px] font-semibold text-white">{displayName}</p>
                            {!c.canMessage ? (
                              <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                                Request
                              </span>
                            ) : null}
                            {c.unreadCount > 0 ? (
                              <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-[14px] text-white/50">
                            {!c.canMessage ? 'Waiting for you to follow back to reply' : c.lastMessagePreview || 'No messages yet'}
                          </p>
                        </div>
                        <span className="shrink-0 pt-0.5 text-[12px] text-white/35">{formatTimestamp(c.lastMessageAt)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="shrink-0 pt-4 text-center">
          <Link href="/notifications" className="text-[13px] text-white/40 hover:text-white/65">
            System notifications
          </Link>
        </div>
      </div>
    </div>
  );
}

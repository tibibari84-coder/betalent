'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconChat, IconSearch } from '@/components/ui/Icons';
import { useChatPanel } from '@/contexts/ChatPanelContext';

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
};

type AccessState =
  | { canMessage: true; mutualFollow: boolean; priorConsent: boolean }
  | { canMessage: false; mutualFollow: false; priorConsent: boolean };

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
  const { openWithPeer } = useChatPanel();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accessByPeer, setAccessByPeer] = useState<Record<string, AccessState>>({});

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

  useEffect(() => {
    let canceled = false;
    async function hydrateAccess() {
      if (items.length === 0) {
        setAccessByPeer({});
        return;
      }
      const next: Record<string, AccessState> = {};
      await Promise.all(
        items.slice(0, 24).map(async (c) => {
          try {
            const res = await fetch(`/api/chat/${encodeURIComponent(c.peer.id)}/history`);
            const data = await res.json();
            const a = data?.access;
            if (a && typeof a.canMessage === 'boolean') {
              next[c.peer.id] = {
                canMessage: a.canMessage,
                mutualFollow: !!a.mutualFollow,
                priorConsent: !!a.priorConsent,
              };
            }
          } catch {
            /* ignore */
          }
        })
      );
      if (!canceled) setAccessByPeer(next);
    }
    void hydrateAccess();
    return () => {
      canceled = true;
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      const access = accessByPeer[c.peer.id];
      if (activeFilter === 'unread' && c.unreadCount <= 0) return false;
      if (activeFilter === 'requests' && (access?.canMessage ?? true)) return false;
      if (activeFilter === 'following' && !access?.mutualFollow) return false;
      if (!q) return true;
      const n = (c.peer.displayName || '').toLowerCase();
      const u = (c.peer.username || '').toLowerCase();
      const p = (c.lastMessagePreview || '').toLowerCase();
      return n.includes(q) || u.includes(q) || p.includes(q);
    });
  }, [items, query, activeFilter, accessByPeer]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#09090b]">
      <div className="mx-auto w-full max-w-[760px] px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
        <header className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between py-3">
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-white">Inbox</h1>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="h-11 w-11 rounded-[14px] flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors"
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
                className="w-full h-[52px] rounded-[16px] border border-white/[0.1] bg-white/[0.04] px-4 text-[16px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          ) : null}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`h-9 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  activeFilter === f.key
                    ? 'bg-accent/20 text-accent border border-accent/35'
                    : 'bg-white/[0.04] text-white/65 border border-white/[0.08] hover:text-white/90'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <section className="pt-2">
          {loading ? (
            <ul className="space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <li key={i} className="h-[78px] rounded-[16px] bg-white/[0.04] border border-white/[0.05] animate-pulse" />
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-white/[0.06] flex items-center justify-center mb-4">
                <IconChat className="h-7 w-7 text-white/30" />
              </div>
              <p className="text-[16px] font-medium text-white/85">
                {activeFilter === 'requests' ? 'No message requests' : 'No conversations yet'}
              </p>
              <p className="mt-2 text-[14px] text-white/45">
                {activeFilter === 'requests'
                  ? 'Requests from non-mutual connections appear here.'
                  : 'When people message you, conversations appear here.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {filtered.map((c) => {
                const access = accessByPeer[c.peer.id];
                const isRequest = access ? !access.canMessage : false;
                const displayName = c.peer.displayName || `@${c.peer.username}`;
                return (
                  <li key={c.conversationId}>
                    <button
                      type="button"
                      onClick={() =>
                        openWithPeer(c.peer.id, {
                          id: c.peer.id,
                          username: c.peer.username,
                          displayName: c.peer.displayName || c.peer.username,
                          avatarUrl: c.peer.avatarUrl,
                        })
                      }
                      className="w-full text-left px-0 py-3.5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative h-[46px] w-[46px] shrink-0 rounded-full overflow-hidden bg-white/[0.08] flex items-center justify-center">
                          {c.peer.avatarUrl ? (
                            <img src={c.peer.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
                          ) : (
                            <span className="text-[16px] font-semibold text-white/80">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[15px] sm:text-[16px] font-semibold text-white">{displayName}</p>
                            <span className="shrink-0 text-[12px] text-white/45">{formatTimestamp(c.lastMessageAt)}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 min-w-0">
                            <p className="truncate text-[13px] sm:text-[14px] text-white/58">
                              {isRequest ? 'Message request' : c.lastMessagePreview || 'No messages yet'}
                            </p>
                            {c.unreadCount > 0 ? (
                              <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-[11px] font-bold text-white inline-flex items-center justify-center">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="pt-6 text-center">
          <Link href="/notifications" className="text-[13px] text-white/45 hover:text-white/70">
            View system notifications
          </Link>
        </div>
      </div>
    </div>
  );
}


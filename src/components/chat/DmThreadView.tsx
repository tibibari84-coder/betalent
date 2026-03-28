'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import { DM_CONTENT_MAX } from '@/lib/chat-constants';
import { IconPaperAirplane } from '@/components/ui/Icons';
import type { DmPeerSummary } from '@/contexts/ChatPanelContext';

export type DmApiAccess =
  | { canMessage: true; state: 'OPEN'; reason: null; mutualFollow: boolean; priorConsent: boolean }
  | {
      canMessage: false;
      state: 'FOLLOW_TO_MESSAGE' | 'REQUEST_REQUIRED';
      reason: 'NOT_MUTUAL';
      mutualFollow: false;
      priorConsent: boolean;
    };

type ApiMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type DmThreadViewProps = {
  peerId: string;
  peerHint?: DmPeerSummary | null;
  /** Profile link under header area (panel may close on navigate). */
  showProfileLink?: boolean;
  onClosePanel?: () => void;
  refreshUnread?: () => Promise<void>;
  /** After send or history refresh — e.g. refetch conversation list in sliding panel. */
  onThreadActivity?: () => void;
  pollIntervalMs?: number;
  className?: string;
};

function formatShortTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Shared DM thread: bubbles, composer, access gate. Used by full-page inbox and sliding panel.
 */
export function DmThreadView({
  peerId,
  peerHint,
  showProfileLink = true,
  onClosePanel,
  refreshUnread,
  onThreadActivity,
  pollIntervalMs = 2800,
  className,
}: DmThreadViewProps) {
  const { t } = useI18n();
  const [meId, setMeId] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<DmPeerSummary | null>(
    peerHint
      ? {
          id: peerId,
          username: peerHint.username,
          displayName: peerHint.displayName,
          avatarUrl: peerHint.avatarUrl,
        }
      : null
  );
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [access, setAccess] = useState<DmApiAccess | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const lastHistorySigRef = useRef('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshUnreadRef = useRef(refreshUnread);
  const onThreadActivityRef = useRef(onThreadActivity);
  refreshUnreadRef.current = refreshUnread;
  onThreadActivityRef.current = onThreadActivity;

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me');
      const d = await r.json();
      if (d.ok && d.user?.id) setMeId(d.user.id);
    } catch {
      setMeId(null);
    }
  }, []);

  const loadHistory = useCallback(
    async (before?: string) => {
      if (!peerId) return;
      if (!before) setThreadLoading(true);
      try {
        const q = before ? `?before=${encodeURIComponent(before)}` : '';
        const r = await fetch(`/api/chat/${encodeURIComponent(peerId)}/history${q}`);
        const d = await r.json();
        if (!d.ok) return;
        if (d.peer) {
          setActivePeer(d.peer as DmPeerSummary);
        }
        if (d.access) {
          setAccess(d.access as DmApiAccess);
        } else {
          setAccess(null);
        }
        const rows: ApiMessage[] = d.messages ?? [];
        if (before) {
          setMessages((prev) => [...rows, ...prev]);
        } else {
          const sig = rows.map((m) => `${m.id}:${m.isRead ? '1' : '0'}`).join('|');
          if (sig !== lastHistorySigRef.current) {
            lastHistorySigRef.current = sig;
            setMessages(rows);
            queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
          }
        }
        setHasMore(!!d.hasMore);
        await refreshUnreadRef.current?.();
        onThreadActivityRef.current?.();
      } catch {
        /* ignore */
      } finally {
        setThreadLoading(false);
      }
    },
    [peerId]
  );

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (peerHint) {
      setActivePeer({
        id: peerId,
        username: peerHint.username,
        displayName: peerHint.displayName,
        avatarUrl: peerHint.avatarUrl,
      });
    }
  }, [peerId, peerHint]);

  useEffect(() => {
    lastHistorySigRef.current = '';
    setMessages([]);
    setAccess(null);
    void loadHistory();
  }, [peerId, loadHistory]);

  useEffect(() => {
    if (!peerId || pollIntervalMs <= 0) return;
    pollRef.current = setInterval(() => loadHistory(), pollIntervalMs);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [peerId, loadHistory, pollIntervalMs]);

  async function handleSend() {
    if (!peerId || sending) return;
    const text = draft.trim();
    if (!text) return;
    if (access && !access.canMessage) return;
    setSending(true);
    const optimistic: ApiMessage = {
      id: `tmp-${Date.now()}`,
      senderId: meId ?? 'me',
      receiverId: peerId,
      content: text,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    try {
      const r = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: peerId, content: text }),
      });
      const d = await r.json();
      if (!d.ok) {
        const code = typeof d.code === 'string' ? d.code : '';
        if (code === 'NOT_MUTUAL') {
          setAccess({
            canMessage: false,
            state: 'FOLLOW_TO_MESSAGE',
            reason: 'NOT_MUTUAL',
            mutualFollow: false,
            priorConsent: false,
          });
        }
        throw new Error(d.message || 'send failed');
      }
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), d.message]);
      await refreshUnreadRef.current?.();
      onThreadActivityRef.current?.();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-2">
        {showProfileLink && activePeer?.username ? (
          <div className="flex justify-center pb-1">
            <Link
              href={`/profile/${encodeURIComponent(activePeer.username)}`}
              className="text-[11px] text-accent/90 hover:text-accent"
              onClick={() => onClosePanel?.()}
            >
              {t('dm.viewProfile')}
            </Link>
          </div>
        ) : null}
        {threadLoading && messages.length === 0 ? (
          <p className="text-sm text-white/45 text-center py-8">{t('dm.loading')}</p>
        ) : null}
        {hasMore && peerId ? (
          <button
            type="button"
            className="w-full py-2 text-[12px] text-accent/90 hover:text-accent"
            onClick={() => {
              const oldest = messages[0]?.id;
              if (oldest) void loadHistory(oldest);
            }}
          >
            {t('dm.loadOlder')}
          </button>
        ) : null}
        {messages.map((m) => {
          const mine = meId ? m.senderId === meId : false;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug',
                  mine
                    ? 'rounded-br-md bg-accent/25 text-white border border-accent/20'
                    : 'rounded-bl-md bg-white/[0.06] text-white/90 border border-white/[0.06]'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <div
                  className={cn(
                    'flex items-center justify-end gap-1.5 mt-1 text-[10px]',
                    mine ? 'text-white/45' : 'text-white/35'
                  )}
                >
                  <span>{formatShortTime(m.createdAt)}</span>
                  {mine && m.isRead ? <span className="text-emerald-400/90">{t('dm.read')}</span> : null}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {access && !access.canMessage ? (
        <div
          className="shrink-0 border-t border-white/[0.06] p-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div
            className="rounded-[14px] border px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
          >
            <p className="text-[13px] font-semibold text-white mb-1">Message locked</p>
            <p className="text-[12px] text-white/60 leading-[1.45]">
              Only mutual followers can message each other. Follow each other to unlock DMs, or reply if they
              messaged you first.
            </p>
            {activePeer?.username ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/profile/${encodeURIComponent(activePeer.username)}`}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-white/10 px-4 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#c4122f,#e11d48)' }}
                  onClick={() => onClosePanel?.()}
                >
                  View profile
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className="shrink-0 flex gap-2 items-end border-t border-white/[0.06] p-3"
          style={{
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, DM_CONTENT_MAX))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder={t('dm.placeholder')}
            className="flex-1 min-h-[44px] max-h-28 resize-none rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2.5 text-[16px] text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-accent/40"
            style={{ fontSize: '16px' }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !draft.trim()}
            className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center bg-accent text-white disabled:opacity-40 disabled:pointer-events-none hover:opacity-95 transition-opacity"
            aria-label={t('dm.send')}
          >
            <IconPaperAirplane className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

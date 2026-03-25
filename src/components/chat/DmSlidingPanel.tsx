'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatPanel, type DmPeerSummary } from '@/contexts/ChatPanelContext';
import { IconArrowLeft, IconChat, IconPaperAirplane, IconX } from '@/components/ui/Icons';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import { DM_CONTENT_MAX } from '@/lib/chat-constants';

type ApiMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type ApiConversation = {
  conversationId: string;
  peer: DmPeerSummary;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

export function DmSlidingPanel() {
  const { t } = useI18n();
  const {
    isOpen,
    closePanel,
    threadPeerId,
    threadPeerHint,
    clearThreadTarget,
    refreshDmUnread,
    listFocusId,
  } = useChatPanel();

  const [screen, setScreen] = useState<'list' | 'thread'>('list');
  const [meId, setMeId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [activePeer, setActivePeer] = useState<DmPeerSummary | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastHistorySigRef = useRef<string>('');
  const prevListFocusIdRef = useRef(0);

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me');
      const d = await r.json();
      if (d.ok && d.user?.id) setMeId(d.user.id);
    } catch {
      setMeId(null);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    setListLoading((prev) => (prev ? prev : true));
    try {
      const r = await fetch('/api/chat/conversations');
      const d = await r.json();
      if (d.ok && Array.isArray(d.conversations)) {
        setConversations(d.conversations);
        if (typeof d.totalUnread === 'number') {
          /* sync badge via lightweight poll elsewhere; optional */
        }
      }
    } catch {
      /* ignore */
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (peerId: string, before?: string) => {
      if (!before) setThreadLoading(true);
      try {
        const q = before ? `?before=${encodeURIComponent(before)}` : '';
        const r = await fetch(`/api/chat/${encodeURIComponent(peerId)}/history${q}`);
        const d = await r.json();
        if (!d.ok) return;
        if (d.peer) {
          setActivePeer(d.peer);
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
        await refreshDmUnread();
      } catch {
        /* ignore */
      } finally {
        setThreadLoading(false);
      }
    },
    [refreshDmUnread]
  );

  useEffect(() => {
    if (!isOpen) {
      setScreen('list');
      setActivePeer(null);
      setMessages([]);
      setDraft('');
      lastHistorySigRef.current = '';
      if (listPollRef.current) {
        clearInterval(listPollRef.current);
        listPollRef.current = null;
      }
      if (threadPollRef.current) {
        clearInterval(threadPollRef.current);
        threadPollRef.current = null;
      }
      return;
    }

    fetchMe();
    fetchConversations();
    listPollRef.current = setInterval(fetchConversations, 4500);
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
      listPollRef.current = null;
    };
  }, [isOpen, fetchMe, fetchConversations]);

  useEffect(() => {
    if (!isOpen) {
      prevListFocusIdRef.current = 0;
      return;
    }
    if (listFocusId === prevListFocusIdRef.current) return;
    prevListFocusIdRef.current = listFocusId;
    if (listFocusId === 0) return;
    setScreen('list');
    setActivePeer(null);
    setMessages([]);
    lastHistorySigRef.current = '';
  }, [isOpen, listFocusId]);

  useEffect(() => {
    if (!isOpen || !threadPeerId) return;
    const hint: DmPeerSummary = threadPeerHint ?? {
      id: threadPeerId,
      username: '',
      displayName: t('dm.loadingPeer'),
      avatarUrl: null,
    };
    setActivePeer(hint);
    setScreen('thread');
    clearThreadTarget();
    loadHistory(threadPeerId);
  }, [isOpen, threadPeerId, threadPeerHint, clearThreadTarget, loadHistory, t]);

  useEffect(() => {
    if (!isOpen || screen !== 'thread' || !activePeer?.id) {
      if (threadPollRef.current) {
        clearInterval(threadPollRef.current);
        threadPollRef.current = null;
      }
      return;
    }
    const id = activePeer.id;
    threadPollRef.current = setInterval(() => loadHistory(id), 2800);
    return () => {
      if (threadPollRef.current) clearInterval(threadPollRef.current);
      threadPollRef.current = null;
    };
  }, [isOpen, screen, activePeer?.id, loadHistory]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closePanel]);

  async function handleSend() {
    if (!activePeer?.id || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const optimistic: ApiMessage = {
      id: `tmp-${Date.now()}`,
      senderId: meId ?? 'me',
      receiverId: activePeer.id,
      content: text,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const r = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activePeer.id, content: text }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || 'send failed');
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), d.message]);
      fetchConversations();
      await refreshDmUnread();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  function openThread(peer: DmPeerSummary) {
    lastHistorySigRef.current = '';
    setActivePeer(peer);
    setScreen('thread');
    setMessages([]);
    loadHistory(peer.id);
  }

  function backToList() {
    lastHistorySigRef.current = '';
    setScreen('list');
    setActivePeer(null);
    setMessages([]);
    fetchConversations();
  }

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t('dm.closeOverlay')}
        className="fixed inset-0 z-[190] bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={closePanel}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-label={t('dm.title')}
        className={cn(
          'fixed z-[200] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200',
          'top-0 right-0 h-[100dvh] w-full max-w-[440px]',
          'border-l border-white/[0.08]'
        )}
        style={{
          background: 'linear-gradient(180deg, rgba(14,14,18,0.98) 0%, rgba(8,8,10,1) 100%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <header
          className="flex shrink-0 items-center gap-2 px-3 py-3 border-b border-white/[0.06]"
          style={{ minHeight: 52 }}
        >
          {screen === 'thread' ? (
            <button
              type="button"
              onClick={backToList}
              className="h-10 w-10 rounded-[10px] flex items-center justify-center text-white/85 hover:bg-white/[0.06] transition-colors"
              aria-label={t('dm.back')}
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="h-10 w-10 flex items-center justify-center text-accent">
              <IconChat className="w-5 h-5" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-white truncate">
              {screen === 'thread' && activePeer
                ? activePeer.displayName || `@${activePeer.username}`
                : t('dm.title')}
            </h2>
            {screen === 'thread' && activePeer?.username ? (
              <p className="text-[11px] text-white/45 truncate">@{activePeer.username}</p>
            ) : (
              <p className="text-[11px] text-white/45 truncate">{t('dm.subtitle')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="h-10 w-10 rounded-[10px] flex items-center justify-center text-white/75 hover:bg-white/[0.06] transition-colors"
            aria-label={t('dm.close')}
          >
            <IconX className="w-5 h-5" />
          </button>
        </header>

        {screen === 'list' ? (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {listLoading && conversations.length === 0 ? (
              <p className="p-6 text-sm text-white/45 text-center">{t('dm.loading')}</p>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <IconChat className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-sm text-white/55">{t('dm.emptyList')}</p>
                <p className="text-xs text-white/35 mt-2">{t('dm.emptyHint')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {conversations.map((c) => (
                  <li key={c.conversationId}>
                    <button
                      type="button"
                      onClick={() => openThread(c.peer)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors active:bg-white/[0.06]"
                    >
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center text-sm font-semibold text-white/70">
                        {c.peer.avatarUrl ? (
                          <img src={c.peer.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (c.peer.displayName || c.peer.username || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[14px] text-white truncate">
                            {c.peer.displayName || `@${c.peer.username}`}
                          </span>
                          {c.unreadCount > 0 ? (
                            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] font-bold text-white flex items-center justify-center">
                              {c.unreadCount > 9 ? '9+' : c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[12px] text-white/45 truncate mt-0.5">
                          {c.lastMessagePreview || t('dm.noMessagesYet')}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2">
              {activePeer?.username ? (
                <div className="flex justify-center pb-2">
                  <Link
                    href={`/profile/${encodeURIComponent(activePeer.username)}`}
                    className="text-[11px] text-accent/90 hover:text-accent"
                    onClick={closePanel}
                  >
                    {t('dm.viewProfile')}
                  </Link>
                </div>
              ) : null}
              {threadLoading && messages.length === 0 ? (
                <p className="text-sm text-white/45 text-center py-8">{t('dm.loading')}</p>
              ) : null}
              {hasMore && activePeer ? (
                <button
                  type="button"
                  className="w-full py-2 text-[12px] text-accent/90 hover:text-accent"
                  onClick={() => {
                    const oldest = messages[0]?.id;
                    if (oldest) loadHistory(activePeer.id, oldest);
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
                        {mine && m.isRead ? (
                          <span className="text-emerald-400/90">{t('dm.read')}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="shrink-0 p-3 border-t border-white/[0.06] flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, DM_CONTENT_MAX))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                placeholder={t('dm.placeholder')}
                className="flex-1 min-h-[44px] max-h-28 resize-none rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2.5 text-[14px] text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-accent/40"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center bg-accent text-white disabled:opacity-40 disabled:pointer-events-none hover:opacity-95 transition-opacity"
                aria-label={t('dm.send')}
              >
                <IconPaperAirplane className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function formatShortTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

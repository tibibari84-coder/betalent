'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatPanel, type DmPeerSummary } from '@/contexts/ChatPanelContext';
import { DmThreadView } from '@/components/chat/DmThreadView';
import { IconArrowLeft, IconChat, IconX } from '@/components/ui/Icons';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

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
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [activePeer, setActivePeer] = useState<DmPeerSummary | null>(null);

  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastHistorySigRef = useRef<string>('');
  const prevListFocusIdRef = useRef(0);

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

  useEffect(() => {
    if (!isOpen) {
      setScreen('list');
      setActivePeer(null);
      lastHistorySigRef.current = '';
      if (listPollRef.current) {
        clearInterval(listPollRef.current);
        listPollRef.current = null;
      }
      return;
    }

    fetchConversations();
    listPollRef.current = setInterval(fetchConversations, 4500);
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
      listPollRef.current = null;
    };
  }, [isOpen, fetchConversations]);

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
  }, [isOpen, threadPeerId, threadPeerHint, clearThreadTarget, t]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closePanel]);

  function openThread(peer: DmPeerSummary) {
    lastHistorySigRef.current = '';
    setActivePeer(peer);
    setScreen('thread');
  }

  function backToList() {
    lastHistorySigRef.current = '';
    setScreen('list');
    setActivePeer(null);
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
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-[14px] text-white">
                              {c.peer.displayName || `@${c.peer.username}`}
                            </span>
                            {c.unreadCount > 0 ? (
                              <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-white/45">
                            {c.lastMessagePreview || t('dm.noMessagesYet')}
                          </p>
                        </div>
                        {c.lastMessageAt ? (
                          <span className="shrink-0 pt-0.5 text-[11px] text-white/40">
                            {formatListTime(c.lastMessageAt)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : activePeer ? (
          <DmThreadView
            peerId={activePeer.id}
            peerHint={activePeer}
            showProfileLink
            onClosePanel={closePanel}
            refreshUnread={refreshDmUnread}
            onThreadActivity={fetchConversations}
            className="min-h-0 flex-1"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-white/45">{t('dm.loading')}</div>
        )}
      </div>
    </>
  );
}

function formatListTime(iso: string) {
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

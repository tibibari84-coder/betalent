'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type DmPeerSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type ChatPanelContextValue = {
  isOpen: boolean;
  /** Opens panel on conversation list (bumps internal nonce so thread view resets). */
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  /** Increments only when openPanel() is used — DmSlidingPanel resets to list. */
  listFocusId: number;
  /** Open sliding panel focused on a 1:1 thread (e.g. from profile). */
  openWithPeer: (peerId: string, peerHint?: DmPeerSummary | null) => void;
  /** Cleared when panel closes; consumed by DmSlidingPanel to enter thread view. */
  threadPeerId: string | null;
  threadPeerHint: DmPeerSummary | null;
  clearThreadTarget: () => void;
  dmUnread: number;
  refreshDmUnread: () => Promise<void>;
};

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function ChatPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const [threadPeerId, setThreadPeerId] = useState<string | null>(null);
  const [threadPeerHint, setThreadPeerHint] = useState<DmPeerSummary | null>(null);
  const [listFocusId, setListFocusId] = useState(0);

  const refreshDmUnread = useCallback(async () => {
    try {
      const r = await fetch('/api/chat/unread');
      const d = await r.json();
      if (d.ok && typeof d.totalUnread === 'number') setDmUnread(d.totalUnread);
    } catch {
      /* offline / guest */
    }
  }, []);

  useEffect(() => {
    refreshDmUnread();
    const id = window.setInterval(refreshDmUnread, 14_000);
    return () => window.clearInterval(id);
  }, [refreshDmUnread]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setThreadPeerId(null);
    setThreadPeerHint(null);
    setListFocusId(0);
  }, []);

  const openPanel = useCallback(() => {
    setThreadPeerId(null);
    setThreadPeerHint(null);
    setListFocusId((n) => n + 1);
    setOpen(true);
  }, []);

  const openWithPeer = useCallback((peerId: string, peerHint?: DmPeerSummary | null) => {
    setThreadPeerId(peerId);
    setThreadPeerHint(peerHint ?? null);
    setOpen(true);
  }, []);

  const clearThreadTarget = useCallback(() => {
    setThreadPeerId(null);
    setThreadPeerHint(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openPanel,
      closePanel,
      togglePanel: () => setOpen((o) => !o),
      openWithPeer,
      listFocusId,
      threadPeerId,
      threadPeerHint,
      clearThreadTarget,
      dmUnread,
      refreshDmUnread,
    }),
    [
      isOpen,
      openPanel,
      closePanel,
      openWithPeer,
      listFocusId,
      threadPeerId,
      threadPeerHint,
      clearThreadTarget,
      dmUnread,
      refreshDmUnread,
    ]
  );

  return <ChatPanelContext.Provider value={value}>{children}</ChatPanelContext.Provider>;
}

export function useChatPanel(): ChatPanelContextValue {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return ctx;
}

/** Safe for components that may render outside ChatPanelProvider (returns null). */
export function useChatPanelOptional(): ChatPanelContextValue | null {
  return useContext(ChatPanelContext);
}

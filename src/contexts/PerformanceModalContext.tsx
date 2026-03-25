'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type GiftContextType = 'foryou' | 'challenge' | 'live';

type PerformanceModalContextValue = {
  videoId: string | null;
  /** When set, gift sends use challenge context (affects ranking). Default foryou. */
  giftContext: GiftContextType;
  /** When true, gift panel should auto-open (set by openModal options). */
  openGiftPanelOnMount: boolean;
  openModal: (id: string, options?: { giftContext?: GiftContextType; openGiftPanel?: boolean }) => void;
  onClose: () => void;
};

const PerformanceModalContext = createContext<PerformanceModalContextValue | null>(null);

export function PerformanceModalProvider({ children }: { children: ReactNode }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [giftContext, setGiftContext] = useState<GiftContextType>('foryou');
  const [openGiftPanelOnMount, setOpenGiftPanelOnMount] = useState(false);
  const openModal = useCallback((id: string, options?: { giftContext?: GiftContextType; openGiftPanel?: boolean }) => {
    setVideoId(id);
    setGiftContext(options?.giftContext ?? 'foryou');
    setOpenGiftPanelOnMount(options?.openGiftPanel ?? false);
  }, []);
  const onClose = useCallback(() => {
    setVideoId(null);
    setGiftContext('foryou');
    setOpenGiftPanelOnMount(false);
  }, []);

  return (
    <PerformanceModalContext.Provider value={{ videoId, giftContext, openGiftPanelOnMount, openModal, onClose }}>
      {children}
    </PerformanceModalContext.Provider>
  );
}

export function usePerformanceModal(): PerformanceModalContextValue {
  const ctx = useContext(PerformanceModalContext);
  if (!ctx) throw new Error('usePerformanceModal must be used within PerformanceModalProvider');
  return ctx;
}

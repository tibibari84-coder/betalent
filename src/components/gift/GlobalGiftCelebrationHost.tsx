'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getGiftAnimationConfig } from '@/constants/giftAnimationRegistry';
import GiftCelebration from '@/components/gift/GiftCelebration';
import {
  GIFT_CELEBRATION_EVENT,
  mapRarityToCelebrationTier,
  type GiftCelebrationEventDetail,
} from '@/lib/gift-celebration-events';
import type { GiftCelebrationTier } from '@/types/gift-animation';

type ActivePayload = {
  id: string;
  giftName: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  comboCount: number;
  tier: GiftCelebrationTier;
  configKey: string;
};

const COMBO_WINDOW_MS = 3000;

export default function GlobalGiftCelebrationHost() {
  const [active, setActive] = useState<ActivePayload | null>(null);
  const comboRef = useRef<{ count: number; lastAt: number; key: string }>({
    count: 0,
    lastAt: 0,
    key: '',
  });

  useEffect(() => {
    function onEvent(ev: Event) {
      const detail = (ev as CustomEvent<GiftCelebrationEventDetail>).detail;
      if (!detail?.giftName) return;

      const now = Date.now();
      const key = `${detail.type}:${detail.giftSlug ?? detail.giftName}`;
      const withinWindow = now - comboRef.current.lastAt <= COMBO_WINDOW_MS && comboRef.current.key === key;
      const comboCount = detail.comboCount ?? (withinWindow ? comboRef.current.count + 1 : 1);

      comboRef.current = { count: comboCount, lastAt: now, key };

      setActive({
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        giftName: detail.giftName,
        senderName: detail.senderName,
        senderAvatarUrl: detail.senderAvatarUrl,
        comboCount,
        tier: mapRarityToCelebrationTier(detail.giftTier),
        configKey: detail.giftSlug || detail.giftName,
      });
    }

    window.addEventListener(GIFT_CELEBRATION_EVENT, onEvent);
    return () => window.removeEventListener(GIFT_CELEBRATION_EVENT, onEvent);
  }, []);

  const config = useMemo(
    () => (active ? getGiftAnimationConfig(active.configKey) : null),
    [active]
  );

  if (!active || !config) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[260]">
      <GiftCelebration
        config={config}
        scopeContext="overlay"
        className="absolute inset-0"
        comboCount={active.comboCount}
        senderAvatarUrl={active.senderAvatarUrl ?? null}
        senderName={active.senderName}
        tier={active.tier}
        giftLabel={active.giftName}
        onComplete={() => setActive(null)}
      />
    </div>
  );
}

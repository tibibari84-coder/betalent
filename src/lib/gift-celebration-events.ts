'use client';

import type { GiftCelebrationTier } from '@/types/gift-animation';

export type GiftCelebrationEventType = 'GIFT_SENT' | 'GIFT_PURCHASED';
export const GIFT_CELEBRATION_EVENT = 'gift-celebration:trigger';

export type GiftCelebrationEventDetail = {
  type: GiftCelebrationEventType;
  giftName: string;
  giftSlug?: string;
  giftTier?: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  comboCount?: number;
  createdAt?: number;
};

export function mapRarityToCelebrationTier(rarity?: string | null): GiftCelebrationTier {
  const normalized = (rarity ?? '').toUpperCase();
  if (normalized === 'MYTHIC' || normalized === 'LEGENDARY') return 'diamond';
  if (normalized === 'EPIC') return 'gold';
  if (normalized === 'RARE') return 'silver';
  return 'bronze';
}

export function emitGiftCelebrationEvent(detail: GiftCelebrationEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<GiftCelebrationEventDetail>(GIFT_CELEBRATION_EVENT, {
      detail: {
        ...detail,
        comboCount: Math.max(1, detail.comboCount ?? 1),
        createdAt: detail.createdAt ?? Date.now(),
      },
    })
  );
}

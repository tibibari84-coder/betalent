/**
 * Maps live quick-gift coin amounts to catalog gift slugs (exact coinCost match in DB).
 */
export const LIVE_QUICK_GIFT_SLUG_BY_COINS: Record<number, string> = {
  10: 'music-note',
  25: 'microphone',
  50: 'metronome',
  100: 'curtain-call',
};

export const LIVE_QUICK_GIFT_AMOUNTS = [10, 25, 50, 100] as const;

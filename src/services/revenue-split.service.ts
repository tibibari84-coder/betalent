/**
 * Revenue split: used only for gift sends (creator vs platform). Not used for likes or votes.
 *
 * Single source of truth: 70% performer, 30% platform. Safe integer rounding: creator gets
 * floor(percent); platform gets remainder so total always equals gross. Called from gift.service only.
 */

export const DEFAULT_CREATOR_PERCENT = 70;
export const DEFAULT_PLATFORM_PERCENT = 30;

export type SplitConfig = {
  creatorPercent: number;
  platformPercent: number;
};

export type GiftSplitContext = {
  giftId?: string;
  campaignId?: string;
  /** Future: eventId, promoCode, etc. */
};

export type GiftSplitResult = {
  creatorShareCoins: number;
  platformShareCoins: number;
  creatorPercent: number;
  platformPercent: number;
  grossCoins: number;
};

/**
 * Returns the split configuration (creator % / platform %) for the given context.
 * Today: always returns default 70/30. Later: look up by campaignId, giftId, or event
 * (e.g. DB table revenue_split_rules, or feature flags) for special gift campaigns or promos.
 */
export function getSplitConfig(_context?: GiftSplitContext): SplitConfig {
  // Future: if (context?.campaignId) return getCampaignSplit(context.campaignId);
  // Future: if (context?.giftId) return getGiftSplit(context.giftId);
  return {
    creatorPercent: DEFAULT_CREATOR_PERCENT,
    platformPercent: DEFAULT_PLATFORM_PERCENT,
  };
}

/**
 * Computes creator and platform coin shares from a gross coin amount.
 * - Uses getSplitConfig(context) so splits can be overridden per campaign/gift later.
 * - Rounds safely: creator gets floor(creatorPercent% of gross); platform gets (gross - creatorShare)
 *   so creatorShare + platformShare always equals gross (no rounding drift).
 */
export function computeGiftSplit(
  grossCoins: number,
  context?: GiftSplitContext
): GiftSplitResult {
  if (grossCoins < 0 || !Number.isInteger(grossCoins)) {
    throw new Error('revenue-split: grossCoins must be a non-negative integer');
  }
  if (grossCoins === 0) {
    return {
      creatorShareCoins: 0,
      platformShareCoins: 0,
      creatorPercent: DEFAULT_CREATOR_PERCENT,
      platformPercent: DEFAULT_PLATFORM_PERCENT,
      grossCoins: 0,
    };
  }

  const { creatorPercent, platformPercent } = getSplitConfig(context);
  const creatorShareCoins = Math.floor((grossCoins * creatorPercent) / 100);
  const platformShareCoins = grossCoins - creatorShareCoins;

  return {
    creatorShareCoins,
    platformShareCoins,
    creatorPercent,
    platformPercent,
    grossCoins,
  };
}

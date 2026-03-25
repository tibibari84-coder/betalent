/**
 * Admin visibility DTOs for the coin and gift system.
 * Read-only views for inspection; no mutation.
 */

export type AdminCoinPackageView = {
  id: string;
  internalName: string;
  name: string;
  coins: number;
  bonusCoins: number | null;
  price: string;
  currency: string;
  isActive: boolean;
  isPromotional: boolean;
  validFrom: string | null;
  validUntil: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminGiftCatalogView = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  animationType: string | null;
  coinCost: number;
  rarityTier: string;
  isActive: boolean;
  createdAt: string;
};

export type AdminGiftTransactionLogEntry = {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string;
  /** Null if the performance was deleted; ledger row is retained. */
  videoId: string | null;
  videoTitle: string | null;
  giftId: string;
  giftName: string;
  coinAmount: number;
  creatorShareCoins: number;
  platformShareCoins: number;
  status: string;
  createdAt: string;
};

export type AdminCreatorEarningsView = {
  creatorId: string;
  username: string;
  displayName: string;
  availableEarningsCoins: number;
  totalEarningsCoins: number;
  totalGiftsReceivedCount: number;
  pendingPayoutCoins: number;
  updatedAt: string;
};

export type AdminSuspiciousGiftingFlag = {
  kind: 'high_frequency_pair' | 'large_single_transaction' | 'burst_activity';
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  videoId: string | null;
  transactionId: string | null;
  coinAmount: number;
  count?: number;
  windowMinutes?: number;
  createdAt: string;
};

export type AdminHighVolumeSupporter = {
  userId: string;
  username: string;
  displayName: string;
  totalCoinsSpent: number;
  createdAt: string;
};

export type AdminPlatformRevenueView = {
  totalPlatformShareCoins: number;
  totalGrossCoins: number;
  transactionCount: number;
  fromGiftTransactions: number;
  /** Optional time-bound summary (e.g. last 30 days) */
  period?: { from: string; to: string };
};

/** Persisted abuse flags for moderation (anti-abuse layer). */
export type AdminGiftAbuseFlagEntry = {
  id: string;
  giftTransactionId: string | null;
  senderId: string;
  receiverId: string | null;
  videoId: string | null;
  kind: string;
  details: string | null;
  createdAt: string;
};

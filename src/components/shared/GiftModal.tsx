'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconX } from '@/components/ui/Icons';
import { getGiftAnimationConfig } from '@/constants/giftAnimationRegistry';
import GiftCelebration from '@/components/gift/GiftCelebration';
import GiftIcon from '@/components/gift/GiftIcon';
import { emitGiftCelebrationEvent } from '@/lib/gift-celebration-events';
import { interpretApiResponse } from '@/lib/api-json-client';

type Gift = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  coinCost: number;
  rarityTier: string;
};

export type GiftSentPayload = {
  coinsCount: number;
  giftsCount: number;
  sessionStreak?: number;
  topSupporter?: { userId: string; displayName: string; totalCoinsSent: number } | null;
};

export type GiftModalContext = 'foryou' | 'challenge' | 'live';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  creatorName: string;
  /** foryou = For You ranking signals; challenge = challenge ranking; live = live session (requires liveSessionId) */
  giftContext?: GiftModalContext;
  liveSessionId?: string | null;
  onSent?: (payload: GiftSentPayload) => void;
}

function getGiftDisplayName(gift: Gift): string {
  return gift.name;
}

/** Emoji for success animation – tier-based fallback */
const GIFT_EMOJI: Record<string, string> = {
  'music-note': '🎵', microphone: '🎤', headphones: '🎧', 'drum-beat': '🥁',
  piano: '🎹', 'golden-score': '🌟', 'platinum-record': '🏆',
  star: '⭐', heart: '❤️', fire: '🔥', crown: '👑', trophy: '🏆',
  guitar: '🎸', vinyl: '💿', diamond: '💎', clap: '👏', rose: '🌹',
};

function getGiftEmoji(slug: string, tier?: string): string {
  if (GIFT_EMOJI[slug]) return GIFT_EMOJI[slug];
  if (tier === 'MYTHIC') return '👑';
  if (tier === 'LEGENDARY') return '🌟';
  if (tier === 'EPIC') return '✨';
  if (tier === 'RARE') return '💎';
  return '🎁';
}

/** Premium tier accent – subtle gold for rare/legendary */
function isPremiumTier(tier: string): boolean {
  return tier === 'EPIC' || tier === 'LEGENDARY' || tier === 'MYTHIC';
}

/** Premium gift card: icon, label, coin cost, selected state, tier accent */
function GiftCard({
  gift,
  selected,
  onSelect,
  disabled,
}: {
  gift: Gift;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const displayName = getGiftDisplayName(gift);
  const premium = isPremiumTier(gift.rarityTier);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full min-w-0 h-[80px] sm:h-[88px] flex flex-col items-center justify-center gap-1 rounded-[12px] sm:rounded-[14px] border
        transition-all duration-250 ease-out
        ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
      `}
      style={{
        background: selected
          ? 'linear-gradient(180deg, rgba(196,18,47,0.18) 0%, rgba(196,18,47,0.08) 100%)'
          : 'rgba(255,255,255,0.03)',
        borderColor: selected
          ? 'rgba(196,18,47,0.5)'
          : premium
            ? 'rgba(212,175,55,0.15)'
            : 'rgba(255,255,255,0.06)',
        boxShadow: selected
          ? '0 0 0 2px rgba(196,18,47,0.3), 0 8px 24px rgba(196,18,47,0.12)'
          : '0 1px 0 rgba(255,255,255,0.02)',
      }}
      aria-pressed={selected}
      aria-label={`${displayName}, ${gift.coinCost} coins`}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = selected
          ? '0 0 0 2px rgba(196,18,47,0.4), 0 12px 32px rgba(196,18,47,0.15)'
          : '0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = selected
          ? '0 0 0 2px rgba(196,18,47,0.3), 0 8px 24px rgba(196,18,47,0.12)'
          : '0 1px 0 rgba(255,255,255,0.02)';
      }}
    >
      <span
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
          border: '1px solid rgba(255,255,255,0.06)',
          color: premium ? 'rgba(212,175,55,0.95)' : 'rgba(255,255,255,0.9)',
        }}
        aria-hidden
      >
        <GiftIcon slug={gift.slug} name={gift.name} className="w-4 h-4 sm:w-5 sm:h-5" />
      </span>
      <span className="text-[10px] sm:text-[11px] font-semibold text-white text-center leading-tight line-clamp-2 px-0.5 truncate w-full min-w-0">
        {displayName}
      </span>
      <span
        className="text-[9px] sm:text-[10px] font-medium tabular-nums"
        style={{ color: premium ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.55)' }}
      >
        {gift.coinCost} coins
      </span>
    </button>
  );
}

export default function GiftModal({
  isOpen,
  onClose,
  videoId,
  videoTitle,
  creatorName,
  giftContext = 'foryou',
  liveSessionId = null,
  onSent,
}: GiftModalProps) {
  const router = useRouter();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<{
    giftName: string;
    giftSlug: string;
    giftTier?: string;
    newBalance: number;
    coinsCount: number;
    giftsCount: number;
    sessionStreak: number;
    topSupporter: { userId: string; displayName: string; totalCoinsSent: number } | null;
  } | null>(null);
  const [showToast, setShowToast] = useState(false);

  const fetchData = useCallback(() => {
    if (!isOpen) return;
    setError(null);
    setLoadingGifts(true);
    setLoadingWallet(true);
    Promise.all([
      fetch('/api/gifts').then((r) => r.json()),
      fetch('/api/wallet').then((r) => (r.ok ? r.json() : { ok: false })),
    ])
      .then(([giftsRes, walletRes]) => {
        if (giftsRes.ok && Array.isArray(giftsRes.gifts)) setGifts(giftsRes.gifts);
        if (walletRes.ok && typeof walletRes.wallet?.coinBalance === 'number')
          setWalletBalance(walletRes.wallet.coinBalance);
        else setWalletBalance(null);
      })
      .catch(() => setError('Could not load gifts'))
      .finally(() => {
        setLoadingGifts(false);
        setLoadingWallet(false);
      });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedGift(null);
      setSuccessPayload(null);
      setShowToast(false);
    }
  }, [isOpen, fetchData]);

  useEffect(() => {
    if (!successPayload) return;
    setShowToast(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet-balance-updated', { detail: { newBalance: successPayload.newBalance } }));
      window.dispatchEvent(new CustomEvent('video-support-updated', { detail: { videoId } }));
      emitGiftCelebrationEvent({
        type: 'GIFT_SENT',
        giftName: successPayload.giftName,
        giftSlug: successPayload.giftSlug,
        giftTier: successPayload.giftTier,
        senderName: 'You',
        comboCount: successPayload.sessionStreak,
      });
    }
    const closeTimer = setTimeout(() => {
      onSent?.({
        coinsCount: successPayload.coinsCount,
        giftsCount: successPayload.giftsCount,
        sessionStreak: successPayload.sessionStreak,
        topSupporter: successPayload.topSupporter,
      });
      onClose();
    }, 2200);
    return () => clearTimeout(closeTimer);
  }, [successPayload, onSent, onClose]);

  const handleSend = async () => {
    if (!selectedGift || walletBalance === null || sending) return;
    if (walletBalance < selectedGift.coinCost) {
      setError('Not enough coins');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `gift-${videoId}-${Date.now()}`;
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          giftId: selectedGift.id,
          context: giftContext,
          ...(giftContext === 'live' && liveSessionId ? { liveSessionId } : {}),
          idempotencyKey,
        }),
      });
      const parsed = await interpretApiResponse<{
        senderNewBalance?: number;
        video?: { coinsCount?: number; giftsCount?: number };
        sessionStreak?: number;
        topSupporter?: GiftSentPayload['topSupporter'];
      }>(res);
      if (parsed.status === 401) {
        router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!parsed.ok) {
        setError(parsed.message || 'Could not send gift');
        return;
      }
      const data = parsed.data;
      const newBalance = data.senderNewBalance ?? walletBalance - selectedGift.coinCost;
      setWalletBalance(newBalance);
      setSuccessPayload({
        giftName: selectedGift.name,
        giftSlug: selectedGift.slug,
        giftTier: selectedGift.rarityTier,
        newBalance,
        coinsCount: data.video?.coinsCount ?? 0,
        giftsCount: data.video?.giftsCount ?? 0,
        sessionStreak: typeof data.sessionStreak === 'number' ? data.sessionStreak : 1,
        topSupporter: data.topSupporter ?? null,
      });
      setSelectedGift(null);
    } catch {
      setError('Could not send gift');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const isLoggedIn = !loadingWallet && typeof walletBalance === 'number';
  const canSend =
    isLoggedIn &&
    selectedGift !== null &&
    (walletBalance ?? 0) >= selectedGift.coinCost &&
    !sending;
  const insufficientBalance =
    isLoggedIn && selectedGift !== null && (walletBalance ?? 0) < selectedGift.coinCost;

  const glassStyle = {
    background: 'linear-gradient(180deg, rgba(18,22,28,0.98) 0%, rgba(10,12,16,0.99) 100%)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow:
      '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02), 0 0 60px rgba(196,18,47,0.06), inset 0 1px 0 rgba(255,255,255,0.02)',
  };

  const panelContent = successPayload ? (
    <div
      className="relative flex flex-col items-center justify-center py-14 px-6 min-h-[220px]"
      style={{ animation: 'giftSuccessIn 0.4s ease-out' }}
    >
      <GiftCelebration
        config={getGiftAnimationConfig(successPayload.giftSlug)}
        scopeContext="inline"
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      />
      <div
        className="relative z-10 text-5xl"
        style={{ animation: 'giftFloat 1.2s ease-out forwards' }}
        aria-hidden
      >
        {getGiftEmoji(successPayload.giftSlug, successPayload.giftTier)}
      </div>
      <p className="mt-5 text-[16px] font-semibold text-white">
        {successPayload.giftName} sent to {creatorName}
      </p>
      {successPayload.sessionStreak > 1 && (
        <p
          className="mt-2 text-[13px] font-semibold tabular-nums"
          style={{ color: 'rgba(250, 204, 21, 0.95)' }}
        >
          Streak ×{successPayload.sessionStreak}
        </p>
      )}
      {showToast && (
        <div
          className="mt-5 px-5 py-3 rounded-[14px] text-[15px] font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg, rgba(196,18,47,0.25), rgba(196,18,47,0.12))',
            border: '1px solid rgba(196,18,47,0.35)',
            animation: 'toastIn 0.35s ease-out',
          }}
          role="status"
        >
          Gift sent!
        </div>
      )}
      <div
        className="mt-6 px-5 py-3 rounded-[14px] text-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium mb-0.5">New balance</p>
        <p className="text-[22px] font-semibold text-white tabular-nums">
          {successPayload.newBalance.toLocaleString()} <span className="text-[13px] font-normal text-white/60">coins</span>
        </p>
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 font-medium mb-1">
            Support creator
          </p>
          <h2 id="gift-panel-title" className="font-display text-[20px] font-semibold text-white tracking-tight">
            Send a gift to {creatorName}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] rounded-[12px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close"
        >
          <IconX className="w-5 h-5" />
        </button>
      </div>

      {/* Wallet balance – premium card */}
      <div
        className="mt-5 py-4 px-5 rounded-[18px]"
        style={{
          background: 'linear-gradient(135deg, rgba(25,28,35,0.9) 0%, rgba(14,16,20,0.95) 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-medium mb-0.5">
              Your balance
            </p>
            {loadingWallet ? (
              <p className="text-[22px] font-semibold text-white tabular-nums">…</p>
            ) : isLoggedIn ? (
              <p className="text-[24px] font-semibold text-white tabular-nums leading-none">
                {walletBalance?.toLocaleString() ?? 0}{' '}
                <span className="text-[14px] font-normal text-white/55">coins</span>
              </p>
            ) : (
              <p className="text-[14px] text-white/55">Sign in to send gifts</p>
            )}
          </div>
          {isLoggedIn && (
            <Link
              href="/wallet"
              className="text-[12px] font-medium text-[#F099A7] hover:text-white transition-colors"
            >
              Add coins
            </Link>
          )}
        </div>
      </div>

      {/* Gift grid – premium scrollable catalog */}
      <div className="mt-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45 mb-4 font-medium">
          Choose a gift
        </p>
        {loadingGifts ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 max-h-[260px] sm:max-h-[280px] overflow-hidden">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="h-[80px] sm:h-[88px] rounded-[12px] sm:rounded-[14px] bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : gifts.length === 0 ? (
          <p className="text-[14px] text-white/50 py-8 text-center">No gifts available.</p>
        ) : (
          <div
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 max-h-[280px] sm:max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 -mr-1 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.2) transparent',
            }}
          >
            {gifts.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                selected={selectedGift?.id === gift.id}
                onSelect={() => setSelectedGift(selectedGift?.id === gift.id ? null : gift)}
                disabled={isLoggedIn && walletBalance !== null ? walletBalance < gift.coinCost : false}
              />
            ))}
          </div>
        )}
      </div>

      {insufficientBalance && selectedGift && (
        <p className="mt-4 text-[13px] text-amber-200/90" role="status">
          Need {selectedGift.coinCost - (walletBalance ?? 0)} more coins
        </p>
      )}

      {error && (
        <p className="mt-4 text-[13px] text-red-200/90" role="alert">
          {error}
        </p>
      )}

      {/* Send button – premium CTA */}
      {selectedGift && (
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={
              isLoggedIn
                ? handleSend
                : () => router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`)
            }
            disabled={isLoggedIn && !canSend}
            className="w-full h-[48px] rounded-[14px] font-semibold text-[16px] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.99] hover:shadow-[0_8px_28px_rgba(196,18,47,0.4)]"
            style={{
              background: 'linear-gradient(135deg, #c4122f 0%, #e11d48 50%, #c4122f 100%)',
              backgroundSize: '200% 100%',
              boxShadow: '0 6px 24px rgba(196,18,47,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {sending ? 'Sending…' : !isLoggedIn ? 'Sign in to send' : `Send ${getGiftDisplayName(selectedGift)} · ${selectedGift.coinCost} coins`}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-panel-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[440px] md:w-[500px] lg:w-[540px] max-w-[calc(100vw-24px)] max-h-[90vh] overflow-y-auto p-4 sm:p-5 md:p-6"
        style={glassStyle}
      >
        {panelContent}
      </div>
    </>
  );
}

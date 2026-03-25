'use client';

import { useState, useEffect } from 'react';
import { CARD_BASE_STYLE } from '@/constants/card-design-system';

type ReadinessState =
  | 'set_up_payout_method'
  | 'verification_required'
  | 'threshold_not_reached'
  | 'ready_for_future_payouts'
  | 'under_review'
  | 'blocked';

type Readiness = {
  profileStatus: string;
  verificationStatus: string;
  payoutMethodConfigured: boolean;
  minimumThresholdMet: boolean;
  eligibleCoins: number;
  pendingCoins: number;
  minimumRequiredCoins: number;
  readinessState: ReadinessState;
  message: string;
};

function formatCoins(n: number): string {
  return n.toLocaleString();
}

const STATE_LABELS: Record<ReadinessState, string> = {
  set_up_payout_method: 'Get ready for payouts',
  verification_required: 'One more step: verification',
  threshold_not_reached: 'You’re getting there',
  ready_for_future_payouts: 'You’re all set',
  under_review: 'We’re reviewing your account',
  blocked: 'Payouts paused',
};

/**
 * Payout preparation module. Informational only; no real payout action.
 * Premium, creator-friendly copy and styling. Layout dimensions unchanged.
 */
export default function PayoutReadinessModule() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/creators/me/payout-readiness')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && data.readiness) setReadiness(data.readiness);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-[16px] overflow-hidden" style={CARD_BASE_STYLE}>
        <div className="p-5">
          <div className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
      </section>
    );
  }

  if (!readiness) return null;

  const state = readiness.readinessState as ReadinessState;
  const label = STATE_LABELS[state] ?? state;
  const isBlocked = state === 'blocked';
  const isUnderReview = state === 'under_review';
  const isReady = state === 'ready_for_future_payouts';
  const isThresholdNotReached = state === 'threshold_not_reached';

  const innerBoxClass =
    isBlocked
      ? 'border-red-400/20 bg-red-500/[0.06]'
      : isUnderReview
        ? 'border-amber-400/15 bg-amber-500/[0.05]'
        : isReady
          ? 'border-emerald-400/15 bg-emerald-500/[0.05]'
          : 'border-white/[0.06] bg-white/[0.03]';

  return (
    <section className="rounded-[16px] overflow-hidden" style={CARD_BASE_STYLE}>
      <div className="p-5">
        <h2 className="text-[15px] font-semibold text-white mb-1">Payout status</h2>
        <p className="text-[13px] text-white/50 mb-4">{label}</p>
        <div className={`rounded-xl border p-4 ${innerBoxClass}`}>
          <p className="text-[13px] text-white/70 leading-relaxed">{readiness.message}</p>
          {(readiness.eligibleCoins > 0 || readiness.pendingCoins > 0) && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-6 text-[12px]">
              <span className="text-white/50">
                Withdrawable: <span className="text-white/80 font-medium tabular-nums">{formatCoins(readiness.eligibleCoins)}</span>
              </span>
              <span className="text-white/50">
                Pending: <span className="text-white/80 font-medium tabular-nums">{formatCoins(readiness.pendingCoins)}</span>
              </span>
            </div>
          )}
          {isThresholdNotReached && (
            <p className="text-[12px] text-white/50 mt-2">
              {formatCoins(readiness.eligibleCoins)} / {formatCoins(readiness.minimumRequiredCoins)} coins to unlock
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

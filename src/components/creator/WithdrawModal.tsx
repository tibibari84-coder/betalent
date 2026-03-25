'use client';

import { useState } from 'react';
import { IconX } from '@/components/ui/Icons';

const MIN_PAYOUT_USD = 50;

export type PayoutMethod = 'paypal' | 'stripe' | 'bank_transfer';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsd: number;
  /** Called when user confirms withdrawal (UI only; no API yet) */
  onWithdraw?: (method: PayoutMethod, amountUsd: number) => void;
}

const METHOD_OPTIONS: { id: PayoutMethod; label: string }[] = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
];

export default function WithdrawModal({
  isOpen,
  onClose,
  availableUsd,
  onWithdraw,
}: WithdrawModalProps) {
  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canWithdraw = availableUsd >= MIN_PAYOUT_USD && method !== null;

  const handleSubmit = () => {
    if (!canWithdraw || !method) return;
    setSubmitting(true);
    onWithdraw?.(method, availableUsd);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
      setMethod(null);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] rounded-[20px] border overflow-hidden"
        style={{
          background: 'rgba(18,22,31,0.95)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/[0.08]">
          <h2 id="withdraw-title" className="font-display text-[18px] font-semibold text-white tracking-tight">
            Withdraw earnings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08]"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-[13px] text-white/60 leading-snug">
            Minimum: <span className="font-semibold text-white">${MIN_PAYOUT_USD}</span>
          </p>

          {availableUsd < MIN_PAYOUT_USD ? (
            <p className="text-[14px] text-amber-200/90 leading-snug">
              You have ${availableUsd.toFixed(2)} available. Reach ${MIN_PAYOUT_USD} to withdraw.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-white/50 mb-2.5 font-medium">
                  How you’d like to receive
                </p>
                <div className="space-y-2">
                  {METHOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMethod(opt.id)}
                      className="w-full h-12 rounded-xl border flex items-center justify-center font-medium text-[15px] transition-all"
                      style={{
                        background: method === opt.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        borderColor: method === opt.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                        color: 'rgb(255,255,255)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[13px] text-white/55 leading-snug">
                You’ll receive <span className="font-semibold text-white">${availableUsd.toFixed(2)}</span>
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canWithdraw || submitting}
                className="w-full h-[42px] rounded-[12px] font-semibold text-[15px] text-white bg-[#b11226] hover:bg-[#9a0f21] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Processing…' : 'Confirm'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

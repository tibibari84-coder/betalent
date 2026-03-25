'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripePaymentElementOptions } from '@stripe/stripe-js';

/** Allow test keys everywhere; allow live keys only in production. */
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const STRIPE_TEST_PK_PREFIX = 'pk_test_';
const STRIPE_LIVE_PK_PREFIX = 'pk_live_';
const isProduction = process.env.NODE_ENV === 'production';

const stripePromise = (() => {
  if (!STRIPE_PK) return null;
  if (STRIPE_PK.startsWith(STRIPE_TEST_PK_PREFIX)) return loadStripe(STRIPE_PK);
  if (STRIPE_PK.startsWith(STRIPE_LIVE_PK_PREFIX)) return isProduction ? loadStripe(STRIPE_PK) : null;
  return null;
})();

const stripeMode: 'test' | 'live' | 'unknown' =
  STRIPE_PK?.startsWith(STRIPE_LIVE_PK_PREFIX) ? 'live' : STRIPE_PK?.startsWith(STRIPE_TEST_PK_PREFIX) ? 'test' : 'unknown';

type StripePaymentModalProps = {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => void;
  onCancel: () => void;
};

function PaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setProcessing(true);
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/wallet` : '/wallet',
          receipt_email: undefined,
        },
      });
      if (submitError) {
        setError(submitError.message ?? 'Payment failed');
        setProcessing(false);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultCollapsed: false,
          radios: true,
          spacedAccordionItems: true,
        } as StripePaymentElementOptions}
      />
      {error && (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl font-semibold text-[14px] border border-white/20 text-white/90 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || processing}
          className="flex-1 min-h-[44px] rounded-xl font-semibold text-[14px] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            background: 'linear-gradient(135deg, #c4122f, #e11d48)',
            boxShadow: '0 2px 12px rgba(196,18,47,0.25)',
          }}
        >
          {processing ? 'Processing…' : 'Pay'}
        </button>
      </div>
    </form>
  );
}

export default function StripePaymentModal({ clientSecret, amountLabel, onSuccess, onCancel }: StripePaymentModalProps) {
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="rounded-[20px] border border-white/10 bg-[#0D0D0E] p-6 max-w-md w-full">
          <p className="text-[14px] text-white/70">
            Payment not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (
            {isProduction ? 'pk_live_...' : 'pk_test_...'} ) for Stripe {isProduction ? 'live' : 'test'}.
          </p>
          <button type="button" onClick={onCancel} className="mt-4 px-4 py-2 rounded-lg text-[14px] font-medium text-accent hover:bg-accent/10">
            Close
          </button>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#c4122f',
        colorBackground: '#1a1a1c',
        colorText: '#f5f5f5',
        colorDanger: '#ef4444',
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="rounded-[20px] border overflow-hidden max-w-md w-full p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,22,0.98) 0%, rgba(12,12,16,0.99) 100%)',
          borderColor: 'rgba(255,255,255,0.1)',
                }}
      >
        <h3 className="font-display text-[18px] font-semibold text-white mb-1">Complete payment</h3>
        <p className="text-[13px] text-white/60 mb-4">{amountLabel}</p>
        <Elements stripe={stripePromise} options={options}>
          <PaymentForm onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
        <p className="text-[11px] text-white/40 mt-4">
          {stripeMode === 'test' ? 'Stripe test mode. Use card 4242 4242 4242 4242, any future expiry, any CVC.' : 'Stripe live mode.'}
        </p>
      </div>
    </div>
  );
}

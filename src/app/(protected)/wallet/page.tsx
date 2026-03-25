'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  IconCoins,
  IconTrendingUp,
  IconTrendingDown,
  IconGift,
  IconTrophy,
  IconStar,
  IconUpload,
  IconArrowPath,
  IconSparkles,
} from '@/components/ui/Icons';
import { CARD_BASE_STYLE } from '@/constants/card-design-system';
import PayoutReadinessModule from '@/components/creator/PayoutReadinessModule';

type Wallet = {
  coinBalance: number;
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  lifetimeEarned?: number;
  lastDailyBonusClaimAt?: string | null;
};

type CoinPackage = {
  id: string;
  name: string;
  coins: number;
  effectiveCoins: number;
  price: number;
  currency: string;
};

type PaymentsReadiness = {
  stripeConfigured: boolean;
  stripeMode?: 'test' | 'unavailable';
  stripeReasons?: string[];
  /** False until coin-packages API responded — avoids assuming Stripe is on before load. */
  known: boolean;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  isCredit: boolean;
  createdAt: string;
  description: string | null;
  videoTitle?: string | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  counterpartyName?: string | null;
  counterpartyUsername?: string | null;
};

const TX_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PURCHASE: { label: 'Purchase', icon: IconCoins },
  GIFT_SENT: { label: 'Sent Gift', icon: IconGift },
  GIFT_RECEIVED: { label: 'Fan Gift', icon: IconGift },
  REFUND: { label: 'Refund', icon: IconArrowPath },
  BONUS: { label: 'Bonus', icon: IconSparkles },
  PLATFORM_FEE: { label: 'Fee', icon: IconCoins },
  DAILY_BONUS: { label: 'Daily Bonus', icon: IconSparkles },
  VIDEO_UPLOAD_REWARD: { label: 'Upload Reward', icon: IconUpload },
  RECEIVED_VOTES: { label: 'Vote Boost', icon: IconStar },
  SUPER_VOTE_SPENT: { label: 'Super Vote', icon: IconStar },
  CHALLENGE_REWARD: { label: 'Live Challenge Support', icon: IconTrophy },
  ADMIN_ADJUSTMENT: { label: 'Adjustment', icon: IconArrowPath },
};

function getTxDisplay(tx: Transaction): { label: string; icon: React.ComponentType<{ className?: string }> } {
  const config = TX_CONFIG[tx.type];
  if (config) return config;
  return { label: tx.type.replace(/_/g, ' '), icon: IconCoins };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function WalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingCoins, setPendingCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseCancelled, setPurchaseCancelled] = useState(false);
  const [purchasePending, setPurchasePending] = useState(false);
  const [devTestCoinsAvailable, setDevTestCoinsAvailable] = useState(false);
  const [addingDevTestCoins, setAddingDevTestCoins] = useState(false);
  const [payments, setPayments] = useState<PaymentsReadiness>({
    stripeConfigured: false,
    known: false,
  });

  const refresh = () => {
    Promise.all([
      fetch('/api/wallet').then((r) => (r.ok ? r.json() : { ok: false })),
      fetch('/api/wallet/transactions').then((r) => (r.ok ? r.json() : { ok: false })),
      fetch('/api/creators/me/payout-readiness').then((r) => (r.ok ? r.json() : { ok: false })),
    ]).then(([wRes, tRes, pRes]) => {
      if (wRes.ok && wRes.wallet) setWallet(wRes.wallet);
      if (wRes?.devTestCoinsAvailable === true) setDevTestCoinsAvailable(true);
      if (tRes.ok && Array.isArray(tRes.transactions)) setTransactions(tRes.transactions);
      if (pRes?.ok && pRes.readiness?.pendingCoins != null) setPendingCoins(pRes.readiness.pendingCoins);
    });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/wallet').then((r) => (r.ok ? r.json() : { ok: false })),
      fetch('/api/coin-packages').then((r) => (r.ok ? r.json() : { ok: false })),
      fetch('/api/wallet/transactions').then((r) => (r.ok ? r.json() : { ok: false })),
      fetch('/api/creators/me/payout-readiness').then((r) => (r.ok ? r.json() : { ok: false })),
    ]).then(([wRes, pRes, tRes, prRes]) => {
      if (wRes.ok && wRes.wallet) setWallet(wRes.wallet);
      if (wRes?.devTestCoinsAvailable === true) setDevTestCoinsAvailable(true);
      if (pRes.ok && Array.isArray(pRes.packages)) {
        setPackages(pRes.packages);
      }
      if (pRes.payments) {
        setPayments({
          stripeConfigured: Boolean(pRes.payments.stripeConfigured),
          stripeMode:
            pRes.payments.stripeMode === 'test' || pRes.payments.stripeMode === 'unavailable'
              ? pRes.payments.stripeMode
              : 'unavailable',
          stripeReasons: pRes.payments.stripeReasons,
          known: true,
        });
      } else {
        setPayments({ stripeConfigured: false, known: true });
      }
      if (tRes.ok && Array.isArray(tRes.transactions)) setTransactions(tRes.transactions);
      if (prRes?.ok && prRes.readiness?.pendingCoins != null) setPendingCoins(prRes.readiness.pendingCoins);
    })
      .catch(() => {
        setPayments({ stripeConfigured: false, known: true });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const status = searchParams?.get('redirect_status');
    const sessionId = searchParams?.get('session_id');
    if (status === 'succeeded') {
      setPurchasePending(true);
      setPurchaseSuccess(false);
      setPurchaseCancelled(false);
      setPurchaseError(null);
      if (!sessionId) {
        setPurchasePending(false);
        setPurchaseError('Payment redirect missing session id. Please contact support.');
        return;
      }
      let cancelled = false;
      const startedAt = Date.now();
      const maxWaitMs = 60_000;
      const poll = async () => {
        while (!cancelled && Date.now() - startedAt < maxWaitMs) {
          const r = await fetch(`/api/coins/purchase/status?session_id=${encodeURIComponent(sessionId)}`);
          const d = await r.json();
          if (d.ok && d.state === 'confirmed') {
            setPurchasePending(false);
            setPurchaseSuccess(true);
            refresh();
            router.replace('/wallet', { scroll: false });
            setTimeout(() => setPurchaseSuccess(false), 6000);
            return;
          }
          if (d.ok && d.state === 'failed') {
            setPurchasePending(false);
            setPurchaseError('Payment failed. No coins were added.');
            router.replace('/wallet', { scroll: false });
            return;
          }
          if (d.ok && d.state === 'refunded') {
            setPurchasePending(false);
            setPurchaseError(
              d.order?.unrecoveredCoins > 0
                ? `Payment refunded. ${d.order.unrecoveredCoins} refunded coins were already spent and are tracked as unresolved liability.`
                : 'Payment refunded. Refunded coins were safely reversed where available.'
            );
            refresh();
            router.replace('/wallet', { scroll: false });
            return;
          }
          if (d.ok && d.state === 'disputed') {
            setPurchasePending(false);
            setPurchaseError('Payment is under dispute review. Affected funds are marked unsettled.');
            refresh();
            router.replace('/wallet', { scroll: false });
            return;
          }
          if (d.ok && d.state === 'reversal_pending') {
            setPurchasePending(true);
          }
          if (d.ok && d.state === 'partially_reversed') {
            setPurchasePending(false);
            setPurchaseError(
              `Partial reversal completed. ${d.order?.unrecoveredCoins ?? 0} coins remain unrecovered and are tracked.`
            );
            refresh();
            router.replace('/wallet', { scroll: false });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
        if (!cancelled) {
          setPurchasePending(false);
          setPurchaseError('Payment is still processing. Refresh wallet in a few moments.');
          refresh();
          router.replace('/wallet', { scroll: false });
        }
      };
      poll().catch(() => {
        if (!cancelled) {
          setPurchasePending(false);
          setPurchaseError('Could not verify payment status yet. Refresh wallet shortly.');
        }
      });
      return () => {
        cancelled = true;
      };
    }
    if (status === 'cancelled') {
      setPurchaseCancelled(true);
      setPurchasePending(false);
      setPurchaseSuccess(false);
      router.replace('/wallet', { scroll: false });
      const t = setTimeout(() => setPurchaseCancelled(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, router]);

  const balance = wallet?.coinBalance ?? 0;
  const lifetimeEarned = wallet?.lifetimeEarned ?? 0;
  const lifetimeSpent = wallet?.totalCoinsSpent ?? 0;
  const pending = pendingCoins ?? 0;
  const lastClaim = wallet?.lastDailyBonusClaimAt ? new Date(wallet.lastDailyBonusClaimAt) : null;
  const today = new Date();
  const isSameDay =
    lastClaim &&
    lastClaim.getUTCFullYear() === today.getUTCFullYear() &&
    lastClaim.getUTCMonth() === today.getUTCMonth() &&
    lastClaim.getUTCDate() === today.getUTCDate();
  const dailyBonusClaimed = !!isSameDay;

  const handleClaimDailyBonus = async () => {
    if (claimingBonus || dailyBonusClaimed) return;
    setClaimingBonus(true);
    try {
      const res = await fetch('/api/wallet/daily-bonus', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.newBalance != null) {
        setWallet((w) => (w ? { ...w, coinBalance: data.newBalance, lastDailyBonusClaimAt: new Date().toISOString() } : null));
        refresh();
      }
    } finally {
      setClaimingBonus(false);
    }
  };

  const handleAddDevTestCoins = async () => {
    if (addingDevTestCoins || !devTestCoinsAvailable) return;
    setAddingDevTestCoins(true);
    setPurchaseError(null);
    try {
      const res = await fetch('/api/wallet/dev-test-coins', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.newBalance != null) {
        setWallet((w) => (w ? { ...w, coinBalance: data.newBalance } : null));
        refresh();
      } else {
        setPurchaseError(data.message ?? 'Could not add test coins');
      }
    } catch {
      setPurchaseError('Could not add test coins');
    } finally {
      setAddingDevTestCoins(false);
    }
  };

  const handlePurchasePackage = async (packageId: string) => {
    if (purchasing) return;
    setPurchaseError(null);
    setPurchasePending(false);
    setPurchasing(packageId);
    try {
      const res = await fetch('/api/coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?from=${encodeURIComponent('/wallet')}`;
        return;
      }
      if (!data.ok) {
        if (data.code === 'STRIPE_NOT_CONFIGURED') {
          setPurchaseError('Stripe test checkout is not configured for this environment.');
        } else {
          setPurchaseError(data.message ?? 'Could not purchase coins');
        }
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        refresh();
      }
    } catch {
      setPurchaseError('Could not purchase coins');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] pb-24" style={{ backgroundColor: '#0A0A0B' }}>
      <div className="layout-content py-8 md:py-10 space-y-10 md:space-y-12">
        {/* Hero — Available Balance */}
        <section className="relative rounded-[16px] overflow-hidden" style={CARD_BASE_STYLE}>
          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50 mb-2">Available Balance</p>
            {loading ? (
              <p className="text-[40px] md:text-[52px] font-semibold text-white tabular-nums">…</p>
            ) : (
              <p className="text-[40px] md:text-[52px] font-semibold text-white tabular-nums leading-none tracking-tight">
                {balance.toLocaleString()}
                <span className="text-[18px] md:text-[20px] font-medium text-white/50 ml-2">coins</span>
              </p>
            )}
            {!loading && !dailyBonusClaimed && (
              <button
                type="button"
                disabled={claimingBonus}
                onClick={handleClaimDailyBonus}
                className="mt-6 inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #b11226, #c4122f)',
                  boxShadow: '0 4px 20px rgba(196,18,47,0.3)',
                }}
              >
                {claimingBonus ? 'Claiming…' : 'Claim 5 coins · Daily bonus'}
              </button>
            )}
            {!loading && dailyBonusClaimed && (
              <p className="mt-4 text-[13px] text-emerald-400/90 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden />
                Daily bonus claimed
              </p>
            )}
          </div>
        </section>

        {/* Stats cards — Earnings, Spending, Pending */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[16px] p-5" style={CARD_BASE_STYLE}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10">
                <IconTrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/50">Earnings</p>
            </div>
            <p className="text-[22px] font-semibold text-white tabular-nums">
              {loading ? '…' : lifetimeEarned.toLocaleString()}
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">Total earned</p>
          </div>
          <div className="rounded-[16px] p-5" style={CARD_BASE_STYLE}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10">
                <IconTrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/50">Spending</p>
            </div>
            <p className="text-[22px] font-semibold text-white tabular-nums">
              {loading ? '…' : lifetimeSpent.toLocaleString()}
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">Total spent</p>
          </div>
          <div className="rounded-[16px] p-5" style={CARD_BASE_STYLE}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10">
                <IconCoins className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/50">Pending</p>
            </div>
            <p className="text-[22px] font-semibold text-white tabular-nums">
              {loading ? '…' : pending.toLocaleString()}
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">Recent support</p>
          </div>
        </div>

        {/* Buy Coins */}
        <section>
          <h2 className="text-[15px] font-semibold text-white mb-1">Add coins</h2>
          <p className="text-[13px] text-white/50 mb-4">
            {!payments.known
              ? 'Checking purchase options…'
              : devTestCoinsAvailable
                ? payments.stripeConfigured && payments.stripeMode === 'test'
                  ? 'Stripe TEST MODE active: add free dev coins or run test checkout. Not real billing.'
                  : 'Test mode: add free coins for gifting. Stripe test checkout unavailable.'
                : payments.stripeConfigured && payments.stripeMode === 'test'
                  ? 'Stripe TEST MODE active. Checkout is test-only and requires backend webhook confirmation.'
                  : 'Stripe test payments are currently unavailable on this deployment'}
          </p>
          {payments.known && !payments.stripeConfigured && (
            <div
              className="mb-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200 text-[13px]"
              role="alert"
            >
              Stripe test checkout is disabled because test configuration is incomplete.
              {payments.stripeReasons?.includes('STRIPE_WEBHOOK_SECRET_INVALID_OR_MISSING') ? (
                <p className="mt-2 text-[12px] text-amber-100/90">
                  Missing webhook secret. Run:{' '}
                  <span className="font-mono">stripe listen --forward-to localhost:3000/api/webhooks/stripe</span>
                </p>
              ) : null}
            </div>
          )}
          {payments.known && payments.stripeConfigured && payments.stripeMode === 'test' && (
            <div
              className="mb-4 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-200 text-[13px]"
              role="status"
            >
              Stripe TEST MODE is enabled. Coins are credited only after verified webhook confirmation.
            </div>
          )}
          {devTestCoinsAvailable && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleAddDevTestCoins}
                disabled={addingDevTestCoins}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
              >
                {addingDevTestCoins ? 'Adding…' : '+100 test coins (dev)'}
              </button>
              <p className="text-[12px] text-white/40 mt-1.5">Use these to send gifts on videos. No real payment.</p>
            </div>
          )}
          {purchaseSuccess && (
            <div className="mb-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-200 text-[13px]" role="alert">
              Payment successful. Coins added to your wallet.
            </div>
          )}
          {purchasePending && (
            <div className="mb-4 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-200 text-[13px]" role="status">
              Payment received by provider. Waiting for secure backend confirmation before coins are added.
            </div>
          )}
          {purchaseCancelled && (
            <div className="mb-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-200 text-[13px]" role="alert">
              Payment cancelled.
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[88px] rounded-[14px] bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <p className="text-white/40 text-[14px]">No packages available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handlePurchasePackage(pkg.id)}
                  disabled={!!purchasing || purchasePending || !payments.known || !payments.stripeConfigured}
                  className="rounded-[14px] border border-white/[0.06] p-4 flex flex-col items-center justify-center gap-1 w-full transition-all hover:border-white/10 hover:bg-white/[0.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  aria-label={`Buy ${pkg.effectiveCoins} coins for $${pkg.price.toFixed(2)}`}
                >
                  <span className="text-[18px] font-semibold text-white tabular-nums">{pkg.effectiveCoins.toLocaleString()}</span>
                  <span className="text-[14px] text-white/60">${pkg.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
          {purchaseError && (
            <p className="text-[13px] text-rose-300/90 mt-3" role="alert">{purchaseError}</p>
          )}
        </section>

        {/* Transactions */}
        <section className="rounded-[16px] overflow-hidden" style={CARD_BASE_STYLE}>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold text-white">Activity</h2>
            <p className="text-[12px] text-white/50 mt-0.5">Recent transactions</p>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center">
              <IconCoins className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-[14px] text-white/50">No transactions yet</p>
              <p className="text-[13px] text-white/40 mt-1">Earn coins with daily bonus, uploads, and fan support.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {transactions.map((tx) => {
                const { label, icon: Icon } = getTxDisplay(tx);
                const detail = tx.counterpartyName || null;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.isCredit ? 'bg-emerald-500/10' : 'bg-white/5'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${tx.isCredit ? 'text-emerald-400' : 'text-white/50'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-white truncate">{label}</p>
                      {detail &&
                        (tx.counterpartyUsername ? (
                          <Link
                            href={`/profile/${tx.counterpartyUsername}`}
                            className="text-[12px] text-white/50 hover:text-white/80 truncate block"
                          >
                            {detail}
                          </Link>
                        ) : (
                          <span className="text-[12px] text-white/50 truncate block">{detail}</span>
                        ))}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-[14px] font-semibold tabular-nums ${
                          tx.isCredit ? 'text-emerald-400' : 'text-white/80'
                        }`}
                      >
                        {tx.isCredit ? '+' : '−'}{tx.amount.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Payout — minimal */}
        <section>
          <PayoutReadinessModule />
        </section>

        {/* Footer links */}
        <div className="flex flex-wrap gap-6 pt-2">
          <Link href="/feed" className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">
            ← Back to Feed
          </Link>
          <Link href="/dashboard" className="text-[13px] font-medium text-white/60 hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

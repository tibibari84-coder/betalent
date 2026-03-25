'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RIGHT_PANEL_CARD_STYLE } from '@/constants/card-design-system';
import { accentDeepAlpha } from '@/constants/accent-tokens';

type Wallet = {
  coinBalance: number;
  lastDailyBonusClaimAt: string | null;
};

export function WalletSummaryCard() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [claiming, setClaiming] = useState(false);

  const refresh = useCallback(() => {
    fetch('/api/wallet')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.wallet && setWallet(data.wallet));
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('wallet-balance-updated', handler);
    return () => window.removeEventListener('wallet-balance-updated', handler);
  }, [refresh]);

  const lastClaim = wallet?.lastDailyBonusClaimAt ? new Date(wallet.lastDailyBonusClaimAt) : null;
  const today = new Date();
  const dailyBonusClaimed =
    lastClaim &&
    lastClaim.getUTCFullYear() === today.getUTCFullYear() &&
    lastClaim.getUTCMonth() === today.getUTCMonth() &&
    lastClaim.getUTCDate() === today.getUTCDate();

  const handleClaim = async () => {
    if (claiming || dailyBonusClaimed) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/wallet/daily-bonus', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.newBalance != null) {
        setWallet((w) =>
          w ? { ...w, coinBalance: data.newBalance, lastDailyBonusClaimAt: new Date().toISOString() } : null
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  const balance = wallet?.coinBalance ?? 0;

  return (
    <div
      className="w-full min-w-0 shrink-0 overflow-hidden rounded-[16px] p-4 transition-all duration-200 ease-out opacity-[0.96]"
      style={RIGHT_PANEL_CARD_STYLE}
    >
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px]"
            style={{
              background: `radial-gradient(circle at 30% 0%, rgba(255,255,255,0.1), transparent 60%), ${accentDeepAlpha(0.12)}`,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-semibold tracking-[0.14em]"
              style={{
                background: `radial-gradient(circle at 30% 0%, rgba(255,255,255,0.12), transparent 60%), ${accentDeepAlpha(0.15)}`,
              }}
            >
              BT
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/55 font-medium">
              BETALENT Wallet
            </p>
            <p className="text-[12px] text-white/60 truncate leading-[1.35]">
              Coins to support, vote, and unlock creator moments.
            </p>
          </div>
        </div>
        <Link
          href="/wallet"
          className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white hover:border-white/30 transition-colors leading-[1.2]"
        >
          Open
        </Link>
      </div>

      <div className="flex items-end justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/50 font-medium mb-0.5">
            Current balance
          </p>
          <p className="text-[20px] font-semibold text-white tabular-nums leading-none tracking-tight">
            {wallet == null ? '…' : balance.toLocaleString()}
            <span className="ml-1 text-[12px] font-medium text-white/60">coins</span>
          </p>
        </div>
        {wallet != null && (
          <div className="text-right">
            {dailyBonusClaimed ? (
              <p className="text-[11px] text-emerald-300/85 font-medium">Daily bonus claimed</p>
            ) : (
              <button
                type="button"
                disabled={claiming}
                onClick={handleClaim}
                className="inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white/90 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-50 border border-white/14 bg-white/[0.04]"
              >
                {claiming ? 'Claiming…' : 'Claim 5 coins'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

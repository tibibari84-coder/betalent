'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
type SupportData = {
  totalCoinsReceived: number;
  totalGiftsReceived: number;
  recentGifts: Array<{
    id: string;
    senderName: string;
    giftName: string;
    coinAmount: number;
    createdAt: string;
  }>;
  topSupporters: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    totalCoinsSent: number;
    giftsCount: number;
  }>;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

interface VideoSupportModuleProps {
  videoId: string;
  /** Initial counts from page data; updated after gift send */
  initialCoins?: number;
  initialGifts?: number;
  /** Increment to refetch (e.g. after user sends a gift) */
  refreshTrigger?: number;
}

export default function VideoSupportModule({
  videoId,
  initialCoins = 0,
  initialGifts = 0,
  refreshTrigger = 0,
}: VideoSupportModuleProps) {
  const [data, setData] = useState<SupportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinsCount, setCoinsCount] = useState(initialCoins);
  const [giftsCount, setGiftsCount] = useState(initialGifts);

  useEffect(() => {
    setCoinsCount(initialCoins);
    setGiftsCount(initialGifts);
  }, [initialCoins, initialGifts]);

  const [eventBump, setEventBump] = useState(0);
  useEffect(() => {
    const onSupportUpdated = (ev: Event) => {
      const d = (ev as CustomEvent<{ videoId?: string }>).detail;
      if (d?.videoId === videoId) setEventBump((n) => n + 1);
    };
    window.addEventListener('video-support-updated', onSupportUpdated);
    return () => window.removeEventListener('video-support-updated', onSupportUpdated);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/videos/${encodeURIComponent(videoId)}/support`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled || !res?.ok) return;
        setData(res.support);
        setCoinsCount(res.support.totalCoinsReceived);
        setGiftsCount(res.support.totalGiftsReceived);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId, refreshTrigger, eventBump]);

  if (loading && !data) {
    return (
      <div
        className="rounded-[20px] border p-5 sm:p-6 animate-pulse"
        style={{
          background: 'rgba(18,22,31,0.5)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="grid grid-cols-2 gap-6 py-5 px-4 rounded-xl mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="h-16 rounded bg-white/5" />
          <div className="h-16 rounded bg-white/5" />
        </div>
        <div className="h-4 w-32 rounded bg-white/5 mb-6" />
        <div className="h-4 w-24 rounded bg-white/5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
      </div>
    );
  }

  const totalCoins = data?.totalCoinsReceived ?? coinsCount;
  const totalGifts = data?.totalGiftsReceived ?? giftsCount;
  const recentGifts = data?.recentGifts ?? [];
  const topSupporters = data?.topSupporters ?? [];

  return (
    <div
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: 'rgba(18,22,31,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div className="p-5 sm:p-6">
        {/* Stats: primary hierarchy – total support then gifts */}
        <div
          className="grid grid-cols-2 gap-6 sm:gap-8 py-5 px-4 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: '#8b95a5', letterSpacing: '0.12em' }}>
              Total support
            </p>
            <p className="text-[22px] sm:text-[24px] font-semibold text-white leading-none tabular-nums tracking-tight">
              {formatCount(totalCoins)}
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: '#6b7280' }}>coins</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: '#8b95a5', letterSpacing: '0.12em' }}>
              Gifts
            </p>
            <p className="text-[22px] sm:text-[24px] font-semibold text-white leading-none tabular-nums tracking-tight">
              {formatCount(totalGifts)}
            </p>
          </div>
        </div>

        {/* Recent gift activity – secondary */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest mb-2.5 font-medium" style={{ color: '#8b95a5', letterSpacing: '0.12em' }}>
            Recent gift activity
          </p>
          {recentGifts.length === 0 ? (
            <p className="text-[13px]" style={{ color: '#6b7280' }}>
              No gift activity yet
            </p>
          ) : (
            <ul className="space-y-2 min-w-0 overflow-hidden">
              {recentGifts.slice(0, 5).map((g) => (
                <li
                  key={g.id}
                  className="text-[13px] leading-snug flex flex-wrap items-baseline gap-x-1.5 min-w-0 overflow-hidden"
                >
                  <span className="text-white font-medium truncate min-w-0 max-w-[40%]">{g.senderName}</span>
                  <span style={{ color: '#9ba7b8' }} className="shrink-0">sent</span>
                  <span className="text-white truncate min-w-0 max-w-[35%]">{g.giftName}</span>
                  <span className="text-[12px] tabular-nums shrink-0" style={{ color: '#6b7280' }}>
                    · {timeAgo(g.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top supporters – clear counter and list */}
        {topSupporters.length > 0 && (
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-3 font-medium" style={{ color: '#8b95a5', letterSpacing: '0.12em' }}>
              Top supporters
              <span className="ml-1.5 font-normal opacity-80 tabular-nums">
                ({topSupporters.length})
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {topSupporters.slice(0, 5).map((s, idx) => (
                <Link
                  key={s.userId}
                  href={`/profile/${encodeURIComponent(s.username)}`}
                  className="flex items-center gap-2.5 rounded-xl py-2 px-3 min-w-0 overflow-hidden max-w-full transition-colors duration-200 hover:bg-white/[0.06] active:scale-[0.99]"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[12px] font-semibold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: '#B7BDC7' }}
                  >
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt="" className="avatar-image h-full w-full" />
                    ) : (
                      (s.displayName || s.username).charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <span className="text-[13px] font-medium text-white truncate block flex items-center gap-1.5">
                      {idx === 0 && (
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-200/90 shrink-0">
                          Top
                        </span>
                      )}
                      {s.displayName || s.username}
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: '#9ba7b8' }}>
                      {formatCount(s.totalCoinsSent)} coins
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

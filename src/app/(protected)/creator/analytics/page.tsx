'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import {
  IconEye,
  IconHeart,
  IconComment,
  IconGift,
  IconTrendingUp,
  IconArrowLeft,
} from '@/components/ui/Icons';

const CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(14,14,16,0.96) 0%, rgba(10,10,12,0.98) 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '18px',
  boxShadow: '0 12px 28px rgba(0,0,0,0.34), 0 0 20px rgba(140,16,38,0.08)',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

type PerVideo = {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  createdAt: string;
  views: number;
  completionRate: number;
  avgWatchTimeSec: number;
  likes: number;
  comments: number;
  gifts: number;
  coins: number;
  retentionScore: number;
};

type Summary = {
  totalViews: number;
  totalCoinsEarned: number;
  totalVideos: number;
  totalLikes: number;
  totalComments: number;
  totalGifts: number;
};

type Trend = {
  period: string;
  newVideosCount: number;
  newVideosViews: number;
  newVideosLikes: number;
  newVideosCoins: number;
};

type Analytics = {
  summary: Summary;
  perVideo: PerVideo[];
  topPerforming: PerVideo[];
  trend7d: Trend;
  trend30d: Trend;
};

export default function CreatorAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openModal } = usePerformanceModal();

  useEffect(() => {
    fetch('/api/creator/analytics')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res.analytics);
        else setError(res.message ?? 'Failed to load');
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[900px] mx-auto px-4 md:px-6 py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 bg-white/10 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-[18px]" />
            ))}
          </div>
          <div className="h-64 bg-white/5 rounded-[18px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-[900px] mx-auto px-4 md:px-6 py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-accent text-[14px] mb-6"
        >
          <IconArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <p className="text-accent">{error ?? 'Analytics unavailable'}</p>
      </div>
    );
  }

  const { summary, perVideo, topPerforming, trend7d, trend30d } = data;

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 md:px-6 py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-accent text-[14px] mb-6 transition-colors"
      >
        <IconArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-[26px] md:text-[32px] font-bold text-text-primary mb-1">
          Creator Analytics
        </h1>
        <p className="text-[14px] text-text-secondary">
          Understand your performance and grow your audience
        </p>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div style={CARD_STYLE} className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <IconEye className="w-4 h-4 text-accent" />
            <span className="text-[12px] text-text-muted font-medium">Total Views</span>
          </div>
          <p className="text-[20px] md:text-[24px] font-bold text-text-primary tabular-nums">
            {formatNum(summary.totalViews)}
          </p>
        </div>
        <div style={CARD_STYLE} className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <IconGift className="w-4 h-4 text-accent" />
            <span className="text-[12px] text-text-muted font-medium">Coins Earned</span>
          </div>
          <p className="text-[20px] md:text-[24px] font-bold text-text-primary tabular-nums">
            {formatNum(summary.totalCoinsEarned)}
          </p>
        </div>
        <div style={CARD_STYLE} className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <IconHeart className="w-4 h-4 text-accent" />
            <span className="text-[12px] text-text-muted font-medium">Total Likes</span>
          </div>
          <p className="text-[20px] md:text-[24px] font-bold text-text-primary tabular-nums">
            {formatNum(summary.totalLikes)}
          </p>
        </div>
        <div style={CARD_STYLE} className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] text-text-muted font-medium">Videos</span>
          </div>
          <p className="text-[20px] md:text-[24px] font-bold text-text-primary tabular-nums">
            {summary.totalVideos}
          </p>
        </div>
      </section>

      {/* Trends */}
      <section style={CARD_STYLE} className="p-5 md:p-6 mb-8">
        <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4 flex items-center gap-2">
          <IconTrendingUp className="w-5 h-5 text-accent" />
          Growth
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="p-4 rounded-[14px]"
            style={{ background: 'rgba(196,18,47,0.08)', border: '1px solid rgba(196,18,47,0.2)' }}
          >
            <p className="text-[13px] text-text-secondary mb-2">Last 7 days</p>
            <p className="text-[15px] font-semibold text-text-primary">
              {trend7d.newVideosCount} new video{trend7d.newVideosCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[13px] text-text-muted mt-1">
              {formatNum(trend7d.newVideosViews)} views · {formatNum(trend7d.newVideosLikes)} likes ·{' '}
              {formatNum(trend7d.newVideosCoins)} coins
            </p>
          </div>
          <div
            className="p-4 rounded-[14px]"
            style={{ background: 'rgba(196,18,47,0.08)', border: '1px solid rgba(196,18,47,0.2)' }}
          >
            <p className="text-[13px] text-text-secondary mb-2">Last 30 days</p>
            <p className="text-[15px] font-semibold text-text-primary">
              {trend30d.newVideosCount} new video{trend30d.newVideosCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[13px] text-text-muted mt-1">
              {formatNum(trend30d.newVideosViews)} views · {formatNum(trend30d.newVideosLikes)} likes ·{' '}
              {formatNum(trend30d.newVideosCoins)} coins
            </p>
          </div>
        </div>
      </section>

      {/* Top performing */}
      {topPerforming.length > 0 && (
        <section style={CARD_STYLE} className="p-5 md:p-6 mb-8">
          <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4">
            Best Performing
          </h2>
          <div className="space-y-2">
            {topPerforming.slice(0, 5).map((v) => (
              <button
                key={v.videoId}
                type="button"
                onClick={() => openModal(v.videoId)}
                className="w-full flex items-center gap-3 p-3 rounded-[14px] hover:bg-white/5 transition-colors text-left"
              >
                <div
                  className="w-14 h-20 rounded-[10px] shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {v.thumbnailUrl ? (
                    <img
                      src={v.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-text-muted">🎬</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[14px] text-text-primary truncate">{v.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-[12px] text-text-muted">
                    <span>{formatNum(v.views)} views</span>
                    <span>·</span>
                    <span>{v.completionRate}% completion</span>
                    <span>·</span>
                    <span>{formatDuration(v.avgWatchTimeSec)} avg</span>
                  </div>
                </div>
                <div className="flex gap-3 shrink-0 text-[12px] text-text-secondary">
                  <span>{formatNum(v.likes)} ♥</span>
                  <span>{formatNum(v.comments)} 💬</span>
                  <span>{formatNum(v.coins)} 🎁</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* All videos */}
      <section style={CARD_STYLE} className="p-5 md:p-6">
        <h2 className="font-display text-[18px] font-semibold text-text-primary mb-4">
          All Videos
        </h2>
        {perVideo.length === 0 ? (
          <p className="text-text-secondary text-[14px]">No videos yet. Upload your first performance!</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[500px] text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted">Video</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Views</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Completion</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Avg watch</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Likes</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Comments</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Gifts</th>
                  <th className="py-3 px-2 text-[12px] font-semibold text-text-muted text-right">Retention</th>
                </tr>
              </thead>
              <tbody>
                {perVideo.map((v) => (
                  <tr
                    key={v.videoId}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => openModal(v.videoId)}
                  >
                    <td className="py-3 px-2">
                      <p className="font-medium text-[13px] text-text-primary truncate max-w-[180px]">
                        {v.title}
                      </p>
                      <p className="text-[11px] text-text-muted">{formatDuration(v.durationSec)}</p>
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {formatNum(v.views)}
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {v.completionRate}%
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {formatDuration(v.avgWatchTimeSec)}
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {formatNum(v.likes)}
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {formatNum(v.comments)}
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] text-text-secondary tabular-nums">
                      {formatNum(v.gifts)}
                    </td>
                    <td className="py-3 px-2 text-right text-[13px] tabular-nums">
                      <span
                        className={
                          v.retentionScore >= 70
                            ? 'text-green-400'
                            : v.retentionScore >= 40
                              ? 'text-amber-400'
                              : 'text-text-muted'
                        }
                      >
                        {v.retentionScore}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

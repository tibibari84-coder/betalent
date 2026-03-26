'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconUpload, IconLayoutGrid, IconTrendingUp, IconSparkles } from '@/components/ui/Icons';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import { getVideoProcessingLabel } from '@/lib/upload-status';

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type User = {
  displayName: string;
  username: string;
  videosCount: number;
  followersCount: number;
  totalViews: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [recentVideos, setRecentVideos] = useState<
    Array<{ id: string; title: string; viewsCount: number; uploadStatus?: string; processingStatus?: string; createdAt?: string }>
  >([]);
  const { openModal } = usePerformanceModal();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/videos/me').then((r) => r.json()),
    ]).then(([meRes, videosRes]) => {
      const u = meRes.ok ? meRes.user : null;
      const v = videosRes.ok ? videosRes.videos : [];
      setRecentVideos(v.slice(0, 5));
      if (u) {
        setUser({
          displayName: u.displayName,
          username: u.username,
          videosCount: u.videosCount ?? v.length,
          followersCount: u.followersCount ?? 0,
          totalViews: u.totalViews ?? v.reduce((s: number, x: { viewsCount: number }) => s + x.viewsCount, 0),
        });
      }
    });
  }, []);

  return (
    <div className="mobile-page-column w-full max-w-[1200px] py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
      <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-2">Dashboard</h1>
      <p className="text-[15px] text-text-secondary mb-8 md:mb-10">Your creator overview</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 laptop:gap-6 desktop:gap-8 mb-8 laptop:mb-9 desktop:mb-10">
        <Link
          href="/upload"
          className="glass-panel glass-panel-card p-6 flex items-center gap-4 hover:border-accent/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <IconUpload className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Upload</p>
            <p className="text-[13px] text-text-secondary">Share a new performance</p>
          </div>
        </Link>
        <Link
          href={`/profile/${user?.username ?? 'me'}`}
          className="glass-panel glass-panel-card p-6 flex items-center gap-4 hover:border-accent/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-canvas-tertiary flex items-center justify-center">
            <IconLayoutGrid className="w-6 h-6 text-text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Profile</p>
            <p className="text-[13px] text-text-secondary">View your public profile</p>
          </div>
        </Link>
        <Link
          href="/my-videos"
          className="glass-panel glass-panel-card p-6 flex items-center gap-4 hover:border-accent/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-canvas-tertiary flex items-center justify-center">
            <IconTrendingUp className="w-6 h-6 text-text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">My Videos</p>
            <p className="text-[13px] text-text-secondary">Manage your performances</p>
          </div>
        </Link>
        <Link
          href="/creator/analytics"
          className="glass-panel glass-panel-card p-6 flex items-center gap-4 hover:border-accent/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <IconSparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Analytics</p>
            <p className="text-[13px] text-text-secondary">Performance & growth</p>
          </div>
        </Link>
      </div>

      <section className="glass-panel rounded-[24px] p-6">
        <h2 className="font-display text-[18px] font-semibold text-text-primary mb-6">Recent uploads</h2>
        {recentVideos.length === 0 ? (
          <p className="text-text-secondary">No videos yet. Upload your first performance!</p>
        ) : (
          <div className="space-y-2">
            {recentVideos.map((v) => {
              const statusLabel = getVideoProcessingLabel(v.uploadStatus ?? '', v.processingStatus ?? '', v.createdAt);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => openModal(v.id)}
                  className="w-full flex items-center justify-between gap-2 p-3 rounded-[12px] hover:bg-white/5 transition-colors min-w-0 overflow-hidden text-left"
                >
                  <span className="font-medium text-[13px] text-text-primary truncate min-w-0">{v.title}</span>
                  <span className="flex items-center gap-2 shrink-0 min-w-0">
                    {statusLabel && (
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#94a3b8',
                        }}
                      >
                        {statusLabel}
                      </span>
                    )}
                    <span className="text-[12px] text-text-secondary tabular-nums">
                      {formatNum(v.viewsCount)} views
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

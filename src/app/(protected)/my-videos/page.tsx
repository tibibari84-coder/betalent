'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IconUpload } from '@/components/ui/Icons';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import { getVideoProcessingLabel } from '@/lib/upload-status';

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Video = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  category: { name: string; slug: string };
  uploadStatus: string;
  processingStatus: string;
  processingError?: string | null;
};

export default function MyVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { openModal } = usePerformanceModal();

  useEffect(() => {
    fetch('/api/videos/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setVideos(d.videos);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary">My Videos</h1>
          <p className="text-[15px] text-text-secondary mt-1">Manage your performances</p>
        </div>
        <Link href="/upload" className="btn-primary flex items-center justify-center gap-2 shrink-0">
          <IconUpload className="w-5 h-5" />
          Upload
        </Link>
      </header>

      {loading ? (
        <p className="text-text-secondary">Loading…</p>
      ) : videos.length === 0 ? (
        <div
          className="glass-panel rounded-[24px] p-12 text-center"
          style={{ minHeight: 320 }}
        >
          <p className="text-[18px] text-text-primary mb-2">No videos yet</p>
          <p className="text-text-secondary mb-6">Upload your first performance to get started.</p>
          <Link href="/upload" className="btn-primary inline-flex gap-2">
            <IconUpload className="w-5 h-5" />
            Upload Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-card-discovery md:grid-cols-card-discovery-md laptop:grid-cols-card-discovery-laptop desktop:grid-cols-card-discovery-desktop xl-screen:grid-cols-card-discovery-xl ultrawide:grid-cols-card-discovery-ultrawide 5k:grid-cols-card-discovery-5k gap-3 laptop:gap-4 desktop:gap-5">
          {videos.map((v) => {
            const processingLabel = getVideoProcessingLabel(v.uploadStatus, v.processingStatus, v.createdAt);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => openModal(v.id)}
                className="glass-panel glass-panel-card overflow-hidden hover:border-accent/30 transition-colors min-w-0 text-left"
              >
                <div className="aspect-video bg-canvas-tertiary relative overflow-hidden">
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-2 p-4">
                      <span className="text-4xl" aria-hidden>🎬</span>
                      <span className="text-[11px] md:text-xs text-center text-text-muted/90">
                        {processingLabel === 'Generating thumbnail…' ? 'Thumbnail in progress' : 'Video processing'}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[12px] font-medium bg-black/70 shrink-0">
                    {v.durationSec}s
                  </span>
                  {processingLabel && (
                    <span
                      className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-medium shrink-0 max-w-[90%] truncate"
                      style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e2e8f0',
                      }}
                    >
                      {processingLabel}
                    </span>
                  )}
                </div>
                <div className="p-4 min-w-0 overflow-hidden">
                  <h3 className="font-semibold text-[13px] text-text-primary truncate">{v.title}</h3>
                  <p className="text-[12px] text-text-secondary mt-0.5 truncate">{v.category.name}</p>
                  {v.processingError && (
                    <p className="text-[11px] text-amber-400/90 mt-1 truncate" title={v.processingError}>
                      {v.processingError}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-[12px] text-text-muted min-w-0 overflow-hidden">
                    <span className="truncate">{formatCount(v.viewsCount)} views</span>
                    <span className="truncate shrink-0">{formatCount(v.likesCount)} likes</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

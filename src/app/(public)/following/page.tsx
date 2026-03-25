'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import VideoFeedCard, { type VideoFeedItem } from '@/components/feed/VideoFeedCard';

export default function FollowingPage() {
  const [videos, setVideos] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'UNAUTHORIZED' | 'FAILED' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setVideos([]);
    fetch('/api/feed/following?limit=30')
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && (data as { ok?: unknown })?.ok === true && Array.isArray((data as { videos?: unknown }).videos)) {
          setVideos((data as { videos: VideoFeedItem[] }).videos);
        } else {
          const code = (data as { code?: unknown } | null)?.code;
          setError(code === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FAILED');
          setVideos([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('FAILED');
          setVideos([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = !loading && videos.length === 0 && error == null;

  return (
    <div
      className="w-full min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-64px)] desktop:min-h-[calc(100vh-68px)] xl-screen:min-h-[calc(100vh-72px)] pb-24 md:pb-12"
      style={{ backgroundColor: '#0D0D0E' }}
    >
      <div className="w-full max-w-full md:max-w-[680px] lg:max-w-[720px] mx-auto px-4 md:px-6 laptop:px-8 pt-5 laptop:pt-5 desktop:pt-6 min-w-0">
        <header className="mb-7 laptop:mb-8 desktop:mb-9">
          <h1 className="font-display text-[clamp(1.75rem,2vw,2.25rem)] font-bold text-text-primary mb-2">
            Following
          </h1>
          <p className="text-[15px] text-text-secondary">
            Videos from the talent you follow, all in one place.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] py-12 text-text-secondary text-[15px]">
            Loading…
          </div>
        ) : error === 'UNAUTHORIZED' ? (
          <section className="glass-panel rounded-[24px] p-12 md:p-16 text-center max-w-[560px] mx-auto">
            <div className="w-16 h-16 rounded-full bg-canvas-tertiary/80 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="font-display text-[22px] font-semibold text-text-primary mb-3">
              Sign in to see your Following feed
            </h2>
            <p className="text-[15px] text-text-secondary mb-8">
              Login required to view videos from creators you follow.
            </p>
            <Link href="/login?from=/following" className="btn-primary inline-flex items-center gap-2">
              Sign in
            </Link>
          </section>
        ) : error === 'FAILED' ? (
          <section className="glass-panel rounded-[24px] p-12 md:p-16 text-center max-w-[560px] mx-auto">
            <div className="w-16 h-16 rounded-full bg-canvas-tertiary/80 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-display text-[22px] font-semibold text-text-primary mb-3">
              Couldn’t load Following
            </h2>
            <p className="text-[15px] text-text-secondary mb-8">
              Please try again later.
            </p>
            <Link href="/explore" className="btn-primary inline-flex items-center gap-2">
              Explore performers
            </Link>
          </section>
        ) : isEmpty ? (
          <section className="glass-panel rounded-[24px] p-12 md:p-16 text-center max-w-[560px] mx-auto">
            <div className="w-16 h-16 rounded-full bg-canvas-tertiary/80 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="font-display text-[22px] font-semibold text-text-primary mb-3">
              Build your personalized feed
            </h2>
            <p className="text-[15px] text-text-secondary mb-8">
              Follow creators to see their performances here. When you follow someone, their videos will appear in this list and in the Following tab on the feed.
            </p>
            <Link href="/explore" className="btn-primary inline-flex items-center gap-2">
              Discover Performers
            </Link>
          </section>
        ) : (
          <div className="flex flex-col gap-7">
            {videos.map((item) => (
              <div key={item.id} className="w-full flex-shrink-0">
                <VideoFeedCard
                  item={item}
                  variant="card"
                  onVideoRemoved={(removedId) => setVideos((list) => list.filter((x) => x.id !== removedId))}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

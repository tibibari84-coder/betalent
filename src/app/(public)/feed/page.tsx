'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import FeedTabBar from '@/components/feed/FeedTabBar';
import { FirstSessionBanner } from '@/components/feed/FirstSessionBanner';
import { type VideoFeedItem } from '@/components/feed/VideoFeedCard';
import FeedVideoList from '@/components/feed/FeedVideoList';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { FeedActiveCardProvider } from '@/contexts/FeedActiveCardContext';
import { fetchFeedWithRetry } from '@/lib/feed-fetch';
import { useViewer } from '@/contexts/ViewerContext';
import { mergeForYouWithSuggestions } from '@/lib/feed-merge-suggestions';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

type TabId = 'for-you' | 'following' | 'trending' | 'new-voices' | 'challenges';

export default function FeedPage() {
  const { viewer } = useViewer();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('for-you');
  const [recPool, setRecPool] = useState<CreatorRecommendationPayload[]>([]);
  const sessionExcludeRef = useRef<Set<string>>(new Set());
  const [forYouVideos, setForYouVideos] = useState<VideoFeedItem[]>([]);
  const [forYouLoading, setForYouLoading] = useState(true);
  const [followingVideos, setFollowingVideos] = useState<VideoFeedItem[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState<'UNAUTHORIZED' | 'FAILED' | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<VideoFeedItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<'FAILED' | null>(null);
  const [newVoicesVideos, setNewVoicesVideos] = useState<VideoFeedItem[]>([]);
  const [newVoicesLoading, setNewVoicesLoading] = useState(false);
  const [newVoicesError, setNewVoicesError] = useState<'FAILED' | null>(null);
  const [challengeVideos, setChallengeVideos] = useState<VideoFeedItem[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeLoadingMore, setChallengeLoadingMore] = useState(false);
  const [challengeHasMore, setChallengeHasMore] = useState(true);
  const [challengeError, setChallengeError] = useState<'FAILED' | null>(null);
  const challengeCursorRef = useRef<string | null>(null);

  const [forYouHasMore, setForYouHasMore] = useState(true);
  const [forYouLoadingMore, setForYouLoadingMore] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [followingLoadingMore, setFollowingLoadingMore] = useState(false);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false);
  const [newVoicesHasMore, setNewVoicesHasMore] = useState(true);
  const [newVoicesLoadingMore, setNewVoicesLoadingMore] = useState(false);

  const forYouVideosRef = useRef<VideoFeedItem[]>([]);
  const followingVideosRef = useRef<VideoFeedItem[]>([]);
  const trendingVideosRef = useRef<VideoFeedItem[]>([]);
  const newVoicesVideosRef = useRef<VideoFeedItem[]>([]);
  const challengeVideosRef = useRef<VideoFeedItem[]>([]);
  forYouVideosRef.current = forYouVideos;
  followingVideosRef.current = followingVideos;
  trendingVideosRef.current = trendingVideos;
  newVoicesVideosRef.current = newVoicesVideos;
  challengeVideosRef.current = challengeVideos;

  const loadForYou = useCallback(async (creatorIdsShown: string[] = [], append = false) => {
    if (append) setForYouLoadingMore(true);
    else setForYouLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (creatorIdsShown.length) params.set('creatorIds', creatorIdsShown.join(','));
      if (append) {
        const ids = forYouVideosRef.current.map((v) => v.id);
        if (ids.length) params.set('excludeIds', ids.join(','));
      }
      const res = await fetchFeedWithRetry(`/api/feed/for-you?${params}`);
      const data = await res.json();
      const list = data?.ok && Array.isArray(data.videos) ? data.videos : [];
      setForYouHasMore(list.length >= 30);
      if (append) setForYouVideos((prev) => {
        const prevIds = new Set(prev.map((v) => v.id));
        return [...prev, ...list.filter((v: VideoFeedItem) => !prevIds.has(v.id))];
      });
      else setForYouVideos(list);
    } catch {
      if (!append) setForYouVideos([]);
    } finally {
      setForYouLoading(false);
      setForYouLoadingMore(false);
    }
  }, []);

  const loadFollowing = useCallback(async (append = false) => {
    if (append) setFollowingLoadingMore(true);
    else {
      setFollowingLoading(true);
      setFollowingError(null);
      setFollowingVideos([]);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append) {
        const list = followingVideosRef.current;
        const last = list[list.length - 1];
        if (last) params.set('cursor', last.id);
      }
      const res = await fetchFeedWithRetry(`/api/feed/following?${params}`);
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && (data as { ok?: unknown })?.ok === true && Array.isArray((data as { videos?: unknown }).videos)) {
        const list = (data as { videos: VideoFeedItem[] }).videos;
        setFollowingHasMore(list.length >= 30);
        if (append) setFollowingVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          return [...prev, ...list.filter((v) => !ids.has(v.id))];
        });
        else setFollowingVideos(list);
      } else {
        if (!append) {
          const code = (data as { code?: unknown } | null)?.code;
          setFollowingError(code === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FAILED');
        }
      }
    } catch {
      if (!append) {
        setFollowingError('FAILED');
        setFollowingVideos([]);
      }
    } finally {
      setFollowingLoading(false);
      setFollowingLoadingMore(false);
    }
  }, []);

  const loadTrending = useCallback(async (append = false) => {
    if (append) setTrendingLoadingMore(true);
    else {
      setTrendingLoading(true);
      setTrendingError(null);
      setTrendingVideos([]);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append) {
        const len = trendingVideosRef.current.length;
        if (len) params.set('offset', String(len));
      }
      const res = await fetchFeedWithRetry(`/api/feed/trending?${params}`);
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && (data as { ok?: unknown })?.ok === true && Array.isArray((data as { videos?: unknown }).videos)) {
        const list = (data as { videos: VideoFeedItem[] }).videos;
        setTrendingHasMore(list.length >= 30);
        if (append) setTrendingVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          return [...prev, ...list.filter((v) => !ids.has(v.id))];
        });
        else setTrendingVideos(list);
      } else {
        if (!append) setTrendingError('FAILED');
      }
    } catch {
      if (!append) {
        setTrendingError('FAILED');
        setTrendingVideos([]);
      }
    } finally {
      setTrendingLoading(false);
      setTrendingLoadingMore(false);
    }
  }, []);

  const loadNewVoices = useCallback(async (append = false) => {
    if (append) setNewVoicesLoadingMore(true);
    else {
      setNewVoicesLoading(true);
      setNewVoicesError(null);
      setNewVoicesVideos([]);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append) {
        const list = newVoicesVideosRef.current;
        const last = list[list.length - 1];
        if (last) params.set('cursor', last.id);
      }
      const res = await fetchFeedWithRetry(`/api/feed/new-voices?${params}`);
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && (data as { ok?: unknown })?.ok === true && Array.isArray((data as { videos?: unknown }).videos)) {
        const list = (data as { videos: VideoFeedItem[] }).videos;
        setNewVoicesHasMore(list.length >= 30);
        if (append) setNewVoicesVideos((prev) => {
          const ids = new Set(prev.map((v) => v.id));
          return [...prev, ...list.filter((v) => !ids.has(v.id))];
        });
        else setNewVoicesVideos(list);
      } else {
        if (!append) setNewVoicesError('FAILED');
      }
    } catch {
      if (!append) {
        setNewVoicesError('FAILED');
        setNewVoicesVideos([]);
      }
    } finally {
      setNewVoicesLoading(false);
      setNewVoicesLoadingMore(false);
    }
  }, []);

  const loadChallenge = useCallback(async (append = false) => {
    if (append) setChallengeLoadingMore(true);
    else {
      setChallengeLoading(true);
      setChallengeError(null);
      setChallengeVideos([]);
      challengeCursorRef.current = null;
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append) {
        const c = challengeCursorRef.current;
        if (c) params.set('cursor', c);
      }
      const res = await fetchFeedWithRetry(`/api/feed/challenge-videos?${params}`);
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && (data as { ok?: unknown })?.ok === true && Array.isArray((data as { videos?: unknown }).videos)) {
        const list = (data as { videos: VideoFeedItem[]; nextCursor?: string | null }).videos;
        const nextCursor = (data as { nextCursor?: string | null }).nextCursor ?? null;
        challengeCursorRef.current = nextCursor;
        setChallengeHasMore(Boolean(nextCursor));
        if (append) {
          setChallengeVideos((prev) => {
            const ids = new Set(prev.map((v) => v.id));
            return [...prev, ...list.filter((v) => !ids.has(v.id))];
          });
        } else {
          setChallengeVideos(list);
        }
      } else {
        if (!append) setChallengeError('FAILED');
      }
    } catch {
      if (!append) {
        setChallengeError('FAILED');
        setChallengeVideos([]);
      }
    } finally {
      setChallengeLoading(false);
      setChallengeLoadingMore(false);
    }
  }, []);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const dismissRec = useCallback((id: string) => {
    setRecPool((p) => p.filter((c) => c.id !== id));
  }, []);

  const followRec = useCallback((id: string) => {
    sessionExcludeRef.current.add(id);
    setRecPool((p) => p.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (!viewer?.id || activeTab !== 'for-you') {
      setRecPool([]);
      return;
    }
    const exclude = Array.from(sessionExcludeRef.current).join(',');
    let cancelled = false;
    fetch(
      `/api/recommendations/creators?limit=24&excludeIds=${encodeURIComponent(exclude)}`,
      { credentials: 'include' }
    )
      .then((r) => r.json())
      .then((data: { ok?: boolean; creators?: CreatorRecommendationPayload[] }) => {
        if (cancelled || !data?.ok || !Array.isArray(data.creators)) return;
        setRecPool(data.creators);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [viewer?.id, activeTab]);

  useEffect(() => {
    if (activeTab === 'for-you') loadForYou();
    else if (activeTab === 'following') loadFollowing();
    else if (activeTab === 'trending') loadTrending();
    else if (activeTab === 'new-voices') loadNewVoices();
    else if (activeTab === 'challenges') loadChallenge();
  }, [activeTab, loadForYou, loadFollowing, loadTrending, loadNewVoices, loadChallenge]);

  const loadingMore =
    activeTab === 'for-you'
      ? forYouLoadingMore
      : activeTab === 'following'
        ? followingLoadingMore
        : activeTab === 'trending'
          ? trendingLoadingMore
          : activeTab === 'new-voices'
            ? newVoicesLoadingMore
            : activeTab === 'challenges'
              ? challengeLoadingMore
              : false;
  const hasMore =
    activeTab === 'for-you'
      ? forYouHasMore
      : activeTab === 'following'
        ? followingHasMore
        : activeTab === 'trending'
          ? trendingHasMore
          : activeTab === 'new-voices'
            ? newVoicesHasMore
            : activeTab === 'challenges'
              ? challengeHasMore
              : false;
  const videos: VideoFeedItem[] =
    activeTab === 'for-you'
      ? forYouVideos
      : activeTab === 'following'
        ? followingVideos
        : activeTab === 'trending'
          ? trendingVideos
          : activeTab === 'new-voices'
            ? newVoicesVideos
            : activeTab === 'challenges'
              ? challengeVideos
              : [];

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || videos.length === 0) return;
    if (activeTab === 'for-you') loadForYou([], true);
    else if (activeTab === 'following') loadFollowing(true);
    else if (activeTab === 'trending') loadTrending(true);
    else if (activeTab === 'new-voices') loadNewVoices(true);
    else if (activeTab === 'challenges') loadChallenge(true);
  }, [activeTab, loadingMore, hasMore, videos.length, loadForYou, loadFollowing, loadTrending, loadNewVoices, loadChallenge]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !handleLoadMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        handleLoadMore();
      },
      { root: scrollContainerRef.current, rootMargin: '200px', threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [handleLoadMore, loadingMore, hasMore, videos.length]);

  const loading =
    activeTab === 'for-you'
      ? forYouLoading
      : activeTab === 'following'
        ? followingLoading
        : activeTab === 'trending'
          ? trendingLoading
          : activeTab === 'new-voices'
            ? newVoicesLoading
            : activeTab === 'challenges'
              ? challengeLoading
              : false;
  const showErrorState =
    !loading &&
    ((activeTab === 'following' && followingError != null) ||
      (activeTab === 'trending' && trendingError != null) ||
      (activeTab === 'new-voices' && newVoicesError != null) ||
      (activeTab === 'challenges' && challengeError != null));

  const showEmptyState =
    (activeTab === 'for-you' ||
      activeTab === 'following' ||
      activeTab === 'trending' ||
      activeTab === 'new-voices' ||
      activeTab === 'challenges') &&
    !loading &&
    !showErrorState &&
    videos.length === 0;
  const emptyStateProps =
    activeTab === 'following'
      ? {
          title: 'No videos from people you follow',
          description: 'Follow creators to see their performances here.',
          ctaLabel: 'Discover performers',
          ctaHref: '/explore',
        }
      : activeTab === 'trending'
        ? {
            title: 'No trending performances yet',
            description: 'Check back soon — trending videos will appear here.',
            ctaLabel: 'Explore performances',
            ctaHref: '/explore',
          }
        : activeTab === 'new-voices'
          ? {
              title: 'No new voices yet',
              description: 'Fresh performances will appear here as creators upload.',
              ctaLabel: 'Explore',
              ctaHref: '/explore',
            }
          : activeTab === 'challenges'
            ? {
                title: 'No challenge performances yet',
                description: 'Entries from active challenges will appear here when performances are public.',
                ctaLabel: 'Browse challenges',
                ctaHref: '/challenges',
              }
            : undefined;

  const errorStateProps =
    activeTab === 'following' && followingError === 'UNAUTHORIZED'
      ? {
          title: 'Sign in to see Following',
          description: 'Login required to view videos from creators you follow.',
          ctaLabel: 'Sign in',
          ctaHref: '/login',
        }
      : activeTab === 'following' && followingError === 'FAILED'
        ? {
            title: 'Couldn’t load Following',
            description: 'Please try again later.',
            ctaLabel: 'Explore performers',
            ctaHref: '/explore',
          }
        : activeTab === 'trending' && trendingError === 'FAILED'
          ? {
              title: 'Couldn’t load Trending',
              description: 'Please try again later.',
              ctaLabel: 'Explore performances',
              ctaHref: '/explore',
            }
          : activeTab === 'new-voices' && newVoicesError === 'FAILED'
            ? {
                title: "Couldn't load New Voices",
                description: 'Please try again later.',
                ctaLabel: 'Explore',
                ctaHref: '/explore',
              }
            : activeTab === 'challenges' && challengeError === 'FAILED'
              ? {
                  title: "Couldn't load challenge feed",
                  description: 'Please try again later.',
                  ctaLabel: 'Browse challenges',
                  ctaHref: '/challenges',
                }
              : undefined;

  const getPreload = useCallback((index: number, activeIndex: number) => {
    if (index === activeIndex) return 'auto';
    if (index === activeIndex + 1) return 'auto';
    if (index === activeIndex - 1) return 'metadata';
    return 'none';
  }, []);

  const forYouFeedRows = useMemo(() => {
    if (activeTab !== 'for-you' || !viewer?.id) return undefined;
    return mergeForYouWithSuggestions(forYouVideos, recPool, {
      onDismiss: dismissRec,
      onFollow: followRec,
    });
  }, [activeTab, viewer?.id, forYouVideos, recPool, dismissRec, followRec]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || videos.length === 0) return;
    const getScrollAmount = () => Math.min(el.clientHeight, typeof window !== 'undefined' ? window.innerHeight : 800);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        el.scrollBy({ top: getScrollAmount(), behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        el.scrollBy({ top: -getScrollAmount(), behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos.length]);

  return (
    <div
      className="flex flex-col h-full min-h-0 flex-1 w-full max-w-none overflow-hidden min-w-0 relative bg-[#050505]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(115% 62% at 52% 2%, rgba(196,18,47,0.12) 0%, transparent 55%), radial-gradient(75% 40% at 85% 88%, rgba(130,30,52,0.12) 0%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 flex justify-center pointer-events-none z-0 opacity-60 md:opacity-100">
        <div
          className="hidden md:block h-full w-full max-w-[900px] border-x border-white/[0.05]"
          style={{
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.35) 100%)',
          }}
        />
      </div>

      {/* Top overlay rail: tabs + optional welcome — full width, no nested page card */}
      <div className="relative z-20 w-full flex-shrink-0 border-b border-white/[0.06] bg-black/45 backdrop-blur-xl">
        <div className="w-full max-w-none px-2 pt-2 pb-0 md:px-3">
          <FirstSessionBanner compact />
        </div>
        <div className="w-full px-1.5 pb-1.5 pt-0 md:px-2 md:pb-2">
          <FeedTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="feed-scroll-container flex-1 overflow-y-auto overflow-x-hidden w-full min-h-0 min-w-0 snap-y snap-mandatory relative z-[1] [scrollbar-gutter:stable]"
      >
        <FeedActiveCardProvider scrollContainerRef={scrollContainerRef}>
          <div
            className="flex flex-col w-full max-w-none min-w-0 min-h-0 flex-1"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
            }}
          >
            {loading && videos.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center min-h-[50dvh] py-10 text-text-secondary text-[14px]">
                Loading…
              </div>
            ) : showErrorState ? (
              <div className="flex flex-1 flex-col min-h-[min(100dvh,calc(100dvh-var(--topbar-height)-var(--bottom-nav-height)))] w-full">
                <FeedEmptyState {...(errorStateProps ?? {})} variant="immersive" />
              </div>
            ) : showEmptyState ? (
              <div className="flex flex-1 flex-col min-h-[min(100dvh,calc(100dvh-var(--topbar-height)-var(--bottom-nav-height)))] w-full">
                <FeedEmptyState {...emptyStateProps} variant="immersive" />
              </div>
            ) : (
              <>
                <FeedVideoList
                  rows={activeTab === 'for-you' && viewer?.id ? forYouFeedRows : undefined}
                  videos={activeTab === 'for-you' && viewer?.id ? undefined : videos}
                  getPreload={getPreload}
                  onVideoRemoved={(id) => {
                    if (activeTab === 'for-you') setForYouVideos((list) => list.filter((v) => v.id !== id));
                    else if (activeTab === 'following') setFollowingVideos((list) => list.filter((v) => v.id !== id));
                    else if (activeTab === 'trending') setTrendingVideos((list) => list.filter((v) => v.id !== id));
                    else if (activeTab === 'new-voices') setNewVoicesVideos((list) => list.filter((v) => v.id !== id));
                    else if (activeTab === 'challenges') setChallengeVideos((list) => list.filter((v) => v.id !== id));
                  }}
                />
                {videos.length > 0 && (
                  <div ref={loadMoreRef} className="min-h-[1px] flex items-center justify-center py-4">
                    {loadingMore && (
                      <span className="text-text-secondary text-[14px]">Loading…</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </FeedActiveCardProvider>
      </div>
    </div>
  );
}

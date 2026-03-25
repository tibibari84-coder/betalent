'use client';

import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { IconPlay, IconVolumeUp, IconVolumeMute } from '@/components/ui/Icons';
import { useQualifiedViewTracking } from '@/hooks/useQualifiedViewTracking';
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 400;
const QUICK_SKIP_SECONDS = 2;
const COMPLETION_THRESHOLD = 0.9;
const WATCH_MILESTONES = [0.25, 0.5, 0.75, 1] as const;

interface FeedVideoPlayerProps {
  videoId: string;
  videoUrl: string | null | undefined;
  thumbnailUrl?: string | null;
  title: string;
  isActive: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onOpenModal?: () => void;
  onDoubleTapLike?: () => void;
  /** Server-reported duration for qualified view threshold */
  durationSec?: number;
}

function sendWatchStat(
  videoId: string,
  payload: {
    watchedSeconds: number;
    watchedPercent: number;
    completed: boolean;
    skippedQuickly: boolean;
    replayed: boolean;
    isFinal?: boolean;
  }
) {
  if (typeof window === 'undefined') return;
  fetch(`/api/videos/${videoId}/watch-stat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function FeedVideoPlayerInner({
  videoId,
  videoUrl,
  thumbnailUrl,
  title,
  isActive,
  preload = 'none',
  onOpenModal,
  onDoubleTapLike,
  durationSec: durationSecProp,
}: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const watchStartRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMilestoneSentRef = useRef(0);
  const replayCountRef = useRef(0);
  const lastPlayTimeRef = useRef(0);
  const isTabVisibleRef = useRef(true);

  const togglePlay = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      const v = videoRef.current;
      if (!v || !videoUrl) {
        onOpenModal?.();
        return;
      }
      if (v.paused) {
        v.play().catch(() => {});
        setPlaying(true);
        watchStartRef.current = watchStartRef.current ?? Date.now();
      } else {
        v.pause();
        setPlaying(false);
      }
    },
    [videoUrl, onOpenModal]
  );

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const now = Date.now();
      const elapsed = now - lastTapRef.current;
      if (elapsed < DOUBLE_TAP_MS && elapsed > 0) {
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        lastTapRef.current = 0;
        onDoubleTapLike?.();
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 800);
        return;
      }
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        toggleMute(e as React.MouseEvent);
      }, DOUBLE_TAP_MS);
    },
    [toggleMute, onDoubleTapLike]
  );

  useEffect(
    () => () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    },
    []
  );

  const handleLongPressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        togglePlay();
      }, LONG_PRESS_MS);
    },
    [togglePlay]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (isActive && !loadError) {
      v.muted = true;
      setMuted(true);
      v.play().then(() => setPlaying(true)).catch(() => setLoadError(true));
      watchStartRef.current = watchStartRef.current ?? Date.now();
      lastMilestoneSentRef.current = 0;
      replayCountRef.current = 0;
      lastPlayTimeRef.current = 0;
    } else {
      v.pause();
      setPlaying(false);
      watchStartRef.current = null;
      if (v.duration > 0) {
        const watchedSeconds = Math.round(v.currentTime);
        const watchedPercent = v.currentTime / v.duration;
        sendWatchStat(videoId, {
          watchedSeconds,
          watchedPercent,
          completed: watchedPercent >= COMPLETION_THRESHOLD,
          skippedQuickly: watchedSeconds < QUICK_SKIP_SECONDS,
          replayed: replayCountRef.current > 0,
          isFinal: true,
        });
      }
    }
  }, [isActive, videoUrl, videoId, loadError]);

  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;
    setLoadError(false);
    const v = videoRef.current;
    const onCanPlay = () => setCanPlay(true);
    const onPlaying = () => setShowVideo(true);
    const onError = () => {
      setCanPlay(false);
      setShowVideo(false);
      setLoadError(true);
    };
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('error', onError);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!isActive) setShowVideo(false);
  }, [isActive]);

  const videoIdRef = useRef(videoId);
  videoIdRef.current = videoId;

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      isTabVisibleRef.current = visible;
      const v = videoRef.current;
      if (!visible && v && !v.paused) {
        v.pause();
        setPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    const bar = progressBarRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      if (bar && v.duration > 0) bar.style.width = `${(v.currentTime / v.duration) * 100}%`;
      if (v.duration <= 0 || !isTabVisibleRef.current) return;
      const pct = v.currentTime / v.duration;
      const last = lastPlayTimeRef.current;
      if (last > 0.5 && v.currentTime < 0.2) {
        replayCountRef.current += 1;
      }
      lastPlayTimeRef.current = v.currentTime;
      for (const m of WATCH_MILESTONES) {
        if (pct >= m - 0.02 && lastMilestoneSentRef.current < m * 100) {
          lastMilestoneSentRef.current = m * 100;
          sendWatchStat(videoIdRef.current, {
            watchedSeconds: Math.round(v.currentTime),
            watchedPercent: m,
            completed: m >= COMPLETION_THRESHOLD,
            skippedQuickly: false,
            replayed: replayCountRef.current > 0,
            isFinal: false,
          });
          break;
        }
      }
    };
    const onDurationChange = () => {
      const d = v.duration || 0;
      setDuration(d);
      if (bar && d > 0) bar.style.width = `${(v.currentTime / d) * 100}%`;
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onEnded = () => {
      setPlaying(false);
      watchStartRef.current = null;
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('pause', onPause);
    v.addEventListener('play', onPlay);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  const hasVideo = Boolean(videoUrl);
  const durationSecForView = Math.max(1, durationSecProp ?? (duration || 45));

  useQualifiedViewTracking({
    videoId,
    durationSec: durationSecForView,
    enabled: isActive && hasVideo,
    videoRef,
    containerRef,
    source: 'feed',
    mediaKey: videoUrl ?? '',
  });
  const showThumbnail = hasVideo ? (!showVideo || loadError) : true;
  const isLoading = hasVideo && isActive && !canPlay && !loadError;
  const effectivePreload = isActive && !loadError ? 'auto' : preload;
  const showErrorFallback = hasVideo && loadError;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-[#0D0D0E] overflow-hidden touch-manipulation select-none"
      style={{
        touchAction: 'manipulation',
        transform: 'translateZ(0)',
      }}
      onClick={(e) => {
        if (!hasVideo) onOpenModal?.();
        else handleTap(e);
      }}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={title}
          className={`feed-media-fill absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
            showThumbnail ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          draggable={false}
          loading="eager"
        />
      )}
      {!thumbnailUrl && (
        <div
          className={`absolute inset-0 flex items-center justify-center text-[#7F8792] transition-opacity duration-300 ${
            showThumbnail ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span className="text-5xl md:text-6xl">🎬</span>
        </div>
      )}

      {hasVideo && (
        <video
          ref={videoRef}
          src={videoUrl!}
          poster={thumbnailUrl ?? undefined}
          playsInline
          muted={muted}
          preload={effectivePreload}
          disablePictureInPicture
          className={`feed-media-fill absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-out ${
            showVideo && !loadError ? 'opacity-100' : 'opacity-0'
          }`}
          loop
          onError={() => setLoadError(true)}
        />
      )}

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-black/30">
          <span className="text-[#9CA3AF] text-sm">Video not available</span>
          {onOpenModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenModal();
              }}
              className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
            >
              Open performance
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="feed-video-loading w-10 h-10 rounded-full border-2 border-white/20 border-t-accent/60" />
        </div>
      )}

      {showErrorFallback && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-black/50"
          style={{ zIndex: 5 }}
        >
          <span className="text-[#9CA3AF] text-sm">Video failed to load</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLoadError(false);
              setCanPlay(false);
              const v = videoRef.current;
              if (v && videoUrl) {
                v.load();
                if (isActive) v.play().then(() => setPlaying(true)).catch(() => setLoadError(true));
              }
            }}
            className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
          {onOpenModal && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenModal();
              }}
              className="px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium hover:bg-accent/30 transition-colors"
            >
              Open performance
            </button>
          )}
        </div>
      )}

      {hasVideo && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          {!playing && canPlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0 w-14 h-14 md:w-16 md:h-16"
                style={{
                  background: 'rgba(196,18,47,0.35)',
                  border: '1px solid rgba(196,18,47,0.5)',
                  boxShadow: '0 0 24px rgba(196,18,47,0.25)',
                }}
              >
                <IconPlay className="w-7 h-7 md:w-8 md:h-8 text-[#c4122f] ml-0.5" aria-hidden />
              </div>
            </div>
          )}
          {/* TikTok-style top progress bar — updated via ref to avoid timeupdate re-renders */}
          {duration > 0 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/40 pointer-events-none z-10">
              <div
                ref={progressBarRef}
                className="h-full bg-accent transition-all duration-75 ease-linear"
                style={{ width: '0%' }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute(e);
            }}
            className="absolute bottom-4 right-4 min-w-[44px] min-h-[44px] p-2 rounded-full bg-black/40 text-white/90 hover:text-white hover:bg-black/50 active:scale-95 transition-transform flex items-center justify-center touch-manipulation z-10"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <IconVolumeMute className="w-5 h-5" />
            ) : (
              <IconVolumeUp className="w-5 h-5" />
            )}
          </button>
        </>
      )}

      {showHeartBurst && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-[heartBurst_0.8s_ease-out_forwards]"
          aria-hidden
        >
          <span className="text-[80px] md:text-[100px] drop-shadow-[0_0_20px_rgba(196,18,47,0.8)]" style={{ color: '#c4122f' }}>
            ❤️
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(FeedVideoPlayerInner);

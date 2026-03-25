'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  IconPlay,
  IconPause,
  IconVolumeUp,
  IconVolumeMute,
  IconX,
  IconArrowsExpand,
} from '@/components/ui/Icons';
import { useQualifiedViewTracking } from '@/hooks/useQualifiedViewTracking';

interface ModalVideoPlayerProps {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  durationSec: number;
  trackViews?: boolean;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ModalVideoPlayer({
  videoId,
  videoUrl,
  thumbnailUrl,
  title,
  durationSec,
  trackViews = true,
  onClose,
}: ModalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveDuration = Math.max(1, durationSec || duration || 1);

  useQualifiedViewTracking({
    videoId,
    durationSec: effectiveDuration,
    enabled: trackViews && Boolean(videoUrl),
    videoRef,
    containerRef,
    source: 'modal',
    mediaKey: videoUrl,
  });

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) setVolume(v.volume);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      v.muted = val === 0;
      setVolume(val);
      setMuted(val === 0);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const v = videoRef.current;
    if (v) {
      v.currentTime = val;
      setCurrentTime(val);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!showControls) return;
    const clear = () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    return clear;
  }, [showControls, playing]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (playing) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        playsInline
        preload="metadata"
        aria-label={title}
        onClick={togglePlay}
      >
        <track kind="captions" />
      </video>

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="h-full bg-white/80 transition-all duration-75"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      )}

      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 hover:bg-black/30"
          aria-label="Play"
        >
          <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-black shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <IconPlay className="w-7 h-7 ml-0.5" />
          </span>
        </button>
      )}

      {showControls && onClose && (
        <div className="absolute top-0 left-0 right-0 flex justify-end p-3 bg-gradient-to-b from-black/40 to-transparent">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors duration-200"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 bg-gradient-to-t from-black/60 to-transparent flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors duration-200"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors duration-200"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <IconVolumeMute className="w-5 h-5" /> : <IconVolumeUp className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-0.5 accent-white/60 bg-white/15 rounded-full cursor-pointer"
          />
          <span className="text-white/60 text-[11px] tabular-nums tracking-tight ml-auto">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors duration-200"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <IconArrowsExpand className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

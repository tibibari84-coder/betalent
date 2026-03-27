'use client';

import { useRef, useId, useState, useCallback, useEffect } from 'react';
import { IconUpload } from '@/components/ui/Icons';
import { FILE_INPUT_ACCEPT, getMimeTypeForUpload, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';

const MAX_MB = Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024);
const DURATION_METADATA_TIMEOUT_MS = 5000;

function processFile(f: File, onFileSelect: (file: File, durationSec: number) => void, onDurationLoaded?: (sec: number) => void) {
  if (!getMimeTypeForUpload(f) || f.size > MAX_VIDEO_FILE_SIZE) {
    onFileSelect(f, 0);
    return;
  }
  const url = URL.createObjectURL(f);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.playsInline = true;
  video.muted = true;
  let settled = false;
  const settle = (sec: number) => {
    if (settled) return;
    settled = true;
    URL.revokeObjectURL(url);
    onFileSelect(f, sec);
    onDurationLoaded?.(sec);
  };
  const timeoutId = window.setTimeout(() => settle(1), DURATION_METADATA_TIMEOUT_MS);
  video.onloadedmetadata = () => {
    window.clearTimeout(timeoutId);
    settle(Math.ceil(video.duration) || 1);
  };
  video.onerror = () => {
    window.clearTimeout(timeoutId);
    settle(1);
  };
  video.src = url;
}

export type UploadDropzoneProps = {
  file: File | null;
  previewUrl: string | null;
  durationSec: number;
  onFileSelect: (file: File, durationSec: number) => void;
  onClear: () => void;
  onDurationLoaded?: (durationSec: number) => void;
  disabled?: boolean;
  error?: string | null;
  /** Large preview, tap to pause, minimal chrome — publish composer only. */
  composer?: boolean;
};

export default function UploadDropzone({
  file,
  previewUrl,
  durationSec,
  onFileSelect,
  onClear,
  onDurationLoaded,
  disabled,
  error,
  composer = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!composer || !previewUrl) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => {});
    }
  }, [composer, previewUrl, file]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    processFile(f, onFileSelect, onDurationLoaded);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || file) return;
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      processFile(f, onFileSelect, onDurationLoaded);
    },
    [disabled, file, onFileSelect, onDurationLoaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!disabled && !file) setIsDragOver(true);
  }, [disabled, file]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  }, []);

  const dropzoneClass =
    'flex flex-col items-center justify-center min-h-[220px] md:min-h-[260px] rounded-[24px] border-2 border-dashed transition-all cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/30 active:border-accent/40 ' +
    (isDragOver ? 'border-accent/60 bg-accent/5' : 'border-[rgba(255,255,255,0.12)] [@media(hover:hover)]:hover:border-accent/40');
  const dropzoneStyle = {
    background: isDragOver ? 'rgba(26,26,28,0.9)' : 'rgba(26,26,28,0.72)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  const composerEmptyClass =
    'flex flex-col items-center justify-center min-h-[160px] rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.03] px-4 py-8 transition cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-accent/30 touch-manipulation ' +
    (isDragOver ? 'border-accent/45 bg-accent/[0.06]' : '[@media(hover:hover)]:hover:border-white/20');

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        className="absolute left-0 top-0 w-px h-px opacity-0 overflow-hidden pointer-events-none border-0 p-0 -z-[1]"
        style={{ clip: 'rect(0,0,0,0)', WebkitAppearance: 'none' }}
        aria-label="Choose video from Photos or Files"
        onChange={handleChange}
        disabled={disabled}
      />
      {!file ? (
        <label
          htmlFor={inputId}
          className={
            composer
              ? `${composerEmptyClass} focus-within:ring-offset-2 focus-within:ring-offset-[#030306]`
              : `${dropzoneClass} touch-manipulation focus-within:ring-2 focus-within:ring-accent/30 focus-within:ring-offset-2 focus-within:ring-offset-[#0D0D0E]`
          }
          style={composer ? undefined : dropzoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span
            className={`mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${composer ? 'bg-accent/15' : 'mb-4 min-h-[44px] min-w-[44px]'}`}
            style={composer ? undefined : { background: 'rgba(177,18,38,0.18)' }}
          >
            <IconUpload className={`text-accent ${composer ? 'h-6 w-6' : 'w-7 h-7'}`} />
          </span>
          <p className={`font-semibold text-text-primary ${composer ? 'text-[14px]' : 'text-[15px] mb-1'}`}>Add your video</p>
          {!composer && (
            <p className="text-[13px] text-text-secondary text-center px-4">
              {isDragOver ? 'Drop video here' : `Choose from device or drag a video (MP4, MOV, M4V · max ${MAX_MB} MB)`}
            </p>
          )}
          {composer && (
            <p className="mt-1 max-w-[280px] text-center text-[12px] text-white/45">MP4, MOV, M4V, WebM · max {MAX_MB} MB</p>
          )}
        </label>
      ) : composer ? (
        <div className="flex w-full flex-col items-center">
          {previewUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) void v.play();
                else v.pause();
              }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
              aria-label="Tap to play or pause preview"
            >
              <video
                ref={videoRef}
                src={previewUrl}
                className="mx-auto max-h-[min(52dvh,560px)] w-full object-contain"
                muted
                playsInline
                loop
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  const sec = Math.ceil(v.duration) || 1;
                  onDurationLoaded?.(sec);
                }}
              />
            </button>
          ) : (
            <p className="text-[14px] text-white/50">{file.name}</p>
          )}
          <div className="mt-3 flex w-full max-w-md items-center justify-between gap-3 px-1">
            {durationSec > 0 ? (
              <span className="text-[12px] tabular-nums text-white/40">{durationSec}s</span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className="min-h-[44px] rounded-full px-4 text-[13px] font-medium text-white/70 transition-colors [@media(hover:hover)]:hover:text-white"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = '';
                  onClear();
                }}
                className="min-h-[44px] rounded-full px-3 text-[13px] font-medium text-white/35 [@media(hover:hover)]:hover:text-white/55"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={dropzoneClass}
          style={dropzoneStyle}
          role="presentation"
        >
          <div className="w-full h-full min-h-[220px] md:min-h-[260px] flex flex-col p-4">
            {previewUrl ? (
              <div className="flex-1 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center min-h-0">
                <video
                  src={previewUrl}
                  className="max-h-[200px] md:max-h-[240px] w-auto object-contain"
                  controls
                  muted
                  playsInline
                  preload="auto"
                  disablePictureInPicture
                  disableRemotePlayback
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    const sec = Math.ceil(v.duration) || 1;
                    onDurationLoaded?.(sec);
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[14px] text-text-secondary">{file.name}</p>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-text-muted truncate min-w-0">{file.name}</p>
              {durationSec > 0 && (
                <span className="text-[12px] text-text-muted shrink-0">{durationSec}s</span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = '';
                  onClear();
                }}
                className="text-[13px] font-medium text-accent shrink-0 min-h-[44px] min-w-[44px] py-2 px-3 inline-flex items-center justify-center touch-manipulation [-webkit-tap-highlight-color:transparent] [@media(hover:hover)]:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-[8px]"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-[13px] text-accent">{error}</p>}
    </div>
  );
}

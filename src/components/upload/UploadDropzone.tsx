'use client';

import { useRef, useId, useState, useCallback } from 'react';
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
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);

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
          className={`${dropzoneClass} touch-manipulation focus-within:ring-2 focus-within:ring-accent/30 focus-within:ring-offset-2 focus-within:ring-offset-[#0D0D0E]`}
          style={dropzoneStyle}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span className="w-14 h-14 rounded-full flex items-center justify-center mb-4 min-w-[44px] min-h-[44px] flex-shrink-0" style={{ background: 'rgba(177,18,38,0.18)' }}>
            <IconUpload className="w-7 h-7 text-accent" />
          </span>
          <p className="text-[15px] font-semibold text-text-primary mb-1">Add your video</p>
          <p className="text-[13px] text-text-secondary text-center px-4">
            {isDragOver ? 'Drop video here' : `Choose from device or drag a video (MP4, MOV, M4V · max ${MAX_MB} MB)`}
          </p>
        </label>
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

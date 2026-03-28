'use client';

import { useRef, useId } from 'react';
import { IconArrowLeft } from '@/components/ui/Icons';
import { FILE_INPUT_ACCEPT, MAX_VIDEO_FILE_SIZE } from '@/constants/upload';
import { processVideoFileWithDuration } from '@/lib/upload-video-file';

const MAX_MB = Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024);

type Props = {
  onFileSelect: (file: File, durationSec: number) => void;
  onDurationLoaded?: (sec: number) => void;
  onBackToStudio: () => void;
  disabled?: boolean;
};

/**
 * Secondary path: pick an existing file without the large “Add your video” dropzone.
 * Primary creator flow should stay in RecordingStudio.
 */
export default function LibraryVideoInlinePicker({
  onFileSelect,
  onDurationLoaded,
  onBackToStudio,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-5">
      <button
        type="button"
        onClick={onBackToStudio}
        disabled={disabled}
        className="mb-4 flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-accent/35 bg-accent/[0.12] px-4 py-3 text-left text-[14px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-45"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <IconArrowLeft className="h-4 w-4 text-white/90" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-snug">Record with camera instead</span>
      </button>

      <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
        Or use a file
      </p>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        className="sr-only"
        aria-label="Choose video from library"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          processVideoFileWithDuration(f, onFileSelect, onDurationLoaded);
          e.target.value = '';
        }}
        disabled={disabled}
      />
      <label
        htmlFor={inputId}
        className="flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.06] px-4 py-3 text-center text-[14px] font-medium text-white/85 transition-colors touch-manipulation [@media(hover:hover)]:hover:bg-white/[0.1]"
      >
        Choose from library…
      </label>
      <p className="mt-2 text-center text-[12px] leading-relaxed text-white/40">
        MP4, MOV, M4V, WebM · max {MAX_MB} MB
      </p>
    </div>
  );
}

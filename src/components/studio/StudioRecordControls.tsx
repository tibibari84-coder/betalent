'use client';

import type { StudioRecorderPhase } from '@/lib/studio/studio-recorder-types';
import { cn } from '@/lib/utils';
import RecordingProgressRing from '@/components/studio/RecordingProgressRing';

export type StudioRecordControlsProps = {
  recPhase: StudioRecorderPhase;
  maxDurationSec: number;
  elapsedMs: number;
  switchingLens: boolean;
  onStart: () => void;
  onStop: () => void;
  className?: string;
};

export default function StudioRecordControls({
  recPhase,
  maxDurationSec,
  elapsedMs,
  switchingLens,
  onStart,
  onStop,
  className,
}: StudioRecordControlsProps) {
  const isPreview = recPhase === 'preview';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const progress = isRecording ? Math.min(1, elapsedMs / Math.max(1, maxDurationSec * 1000)) : 0;

  return (
    <div className={cn('relative flex shrink-0 flex-col items-center touch-manipulation', className)}>
      {/* Double-ring outer shell */}
      <div
        className={cn(
          'relative flex h-[92px] w-[92px] items-center justify-center rounded-full',
          'bg-black/35 p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
          'ring-2 ring-white/28 ring-offset-0 backdrop-blur-md',
          isRecording && 'scale-[0.98]'
        )}
      >
        <div
          className={cn(
            'relative flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-black/50',
            isRecording && 'border-white/30'
          )}
        >
          {isRecording ? <RecordingProgressRing progress={progress} /> : null}
          {isPreview && !switchingLens ? (
            <button
              type="button"
              onClick={onStart}
              className="relative z-[1] flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#E11D48] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_4px_24px_rgba(225,29,72,0.35)] transition-transform active:scale-95"
              aria-label="Start recording"
            />
          ) : null}
          {isRecording ? (
            <button
              type="button"
              onClick={onStop}
              className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-md bg-[#E11D48] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
              aria-label="Stop recording"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
};

export default function StudioRecordControls({
  recPhase,
  maxDurationSec,
  elapsedMs,
  switchingLens,
  onStart,
  onStop,
}: StudioRecordControlsProps) {
  const isPreview = recPhase === 'preview';
  const isRecording = recPhase === 'recording' || recPhase === 'paused';
  const progress = isRecording ? Math.min(1, elapsedMs / Math.max(1, maxDurationSec * 1000)) : 0;

  return (
    <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2">
      <div
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-black/25 backdrop-blur-sm transition-transform',
          isRecording && 'scale-[0.98]'
        )}
      >
        {isRecording ? <RecordingProgressRing progress={progress} /> : null}
        {isPreview && !switchingLens ? (
          <button
            type="button"
            onClick={onStart}
            className="relative z-[1] flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] transition-transform active:scale-95"
            aria-label="Start recording"
          />
        ) : null}
        {isRecording ? (
          <button
            type="button"
            onClick={onStop}
            className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-md bg-red-600 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] transition-transform active:scale-95"
            aria-label="Stop recording"
          />
        ) : null}
      </div>
    </div>
  );
}

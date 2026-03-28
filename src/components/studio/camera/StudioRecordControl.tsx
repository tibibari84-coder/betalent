'use client';

import type { StudioRecorderPhase } from '@/hooks/useStudioRecorder';

const VB = 100;
const CX = 50;
const CY = 50;
const R = 40;
const STROKE = 2.75;
const CIRC = 2 * Math.PI * R;

export type StudioRecordControlProps = {
  recPhase: StudioRecorderPhase;
  maxDurationSec: number;
  elapsedSec: number;
  switchingLens: boolean;
  onStart: () => void;
  onStop: () => void;
  onResume: () => void;
};

export default function StudioRecordControl({
  recPhase,
  maxDurationSec,
  elapsedSec,
  switchingLens,
  onStart,
  onStop,
  onResume,
}: StudioRecordControlProps) {
  const isPreview = recPhase === 'preview';
  const isRecording = recPhase === 'recording';
  const isPaused = recPhase === 'paused';
  const showRing = isRecording || isPaused;
  const progress = showRing ? Math.min(1, elapsedSec / Math.max(1, maxDurationSec)) : 0;
  const dashOffset = CIRC * (1 - progress);

  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
      {showRing ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 text-accent"
          viewBox={`0 0 ${VB} ${VB}`}
          aria-hidden
        >
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            className="text-white/14"
            stroke="currentColor"
            strokeWidth={STROKE}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-150 ease-linear"
          />
        </svg>
      ) : null}
      {isPreview && !switchingLens ? (
        <button
          type="button"
          onClick={onStart}
          className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-sm transition-transform active:scale-[0.94] md:h-[78px] md:w-[78px]"
          aria-label="Start recording"
        >
          <span
            className="absolute h-[62px] w-[62px] rounded-full border border-accent/40 md:h-[58px] md:w-[58px]"
            aria-hidden
          />
          <span
            className="h-[52px] w-[52px] rounded-full bg-accent md:h-[50px] md:w-[50px]"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
          />
        </button>
      ) : null}
      {isRecording ? (
        <button
          type="button"
          onClick={onStop}
          className="relative z-[1] flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/22 bg-white/[0.08] backdrop-blur-sm transition-transform active:scale-[0.94] md:h-[78px] md:w-[78px]"
          aria-label="Stop recording"
        >
          <span
            className="h-8 w-8 rounded-md bg-white md:h-[34px] md:w-[34px]"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.2)' }}
          />
        </button>
      ) : null}
      {isPaused ? (
        <button
          type="button"
          onClick={onResume}
          className="relative z-[1] flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border border-white/22 bg-white/[0.08] backdrop-blur-sm transition-transform active:scale-[0.94] md:h-[78px] md:w-[78px]"
          aria-label="Resume recording"
        >
          <span className="h-[52px] w-[52px] rounded-full bg-accent md:h-[58px] md:w-[58px]" />
        </button>
      ) : null}
    </div>
  );
}

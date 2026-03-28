'use client';

import { cn } from '@/lib/utils';

const VB = 100;
const CX = 50;
const CY = 50;
const R = 44;
const STROKE = 3;
const CIRC = 2 * Math.PI * R;

export type RecordingProgressRingProps = {
  /** 0–1 elapsed vs max duration */
  progress: number;
  className?: string;
};

export default function RecordingProgressRing({ progress, className }: RecordingProgressRingProps) {
  const p = Math.min(1, Math.max(0, progress));
  const dashOffset = CIRC * (1 - p);
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 h-full w-full -rotate-90 text-white', className)}
      viewBox={`0 0 ${VB} ${VB}`}
      aria-hidden
    >
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        className="text-white/15"
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
  );
}

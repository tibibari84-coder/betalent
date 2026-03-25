'use client';

import { TALENT_SCORE_MIN_VOTES } from '@/constants/talent-score';

export type TalentScoreState = 'new' | 'rising' | 'strong' | 'elite';

export function getTalentScoreState(
  score: number | null,
  votesCount?: number
): TalentScoreState {
  if (score == null || (votesCount != null && votesCount < TALENT_SCORE_MIN_VOTES)) {
    return 'new';
  }
  if (score >= 8) return 'elite';
  if (score >= 6.5) return 'strong';
  if (score >= 5) return 'rising';
  return 'new';
}

const STATE_LABELS: Record<TalentScoreState, string> = {
  new: 'New',
  rising: 'Rising',
  strong: 'Strong',
  elite: 'Elite',
};

const STATE_STYLES: Record<
  TalentScoreState,
  { bg: string; border: string; text: string; glow?: string }
> = {
  new: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#9ba7b8',
  },
  rising: {
    bg: 'rgba(196,18,47,0.12)',
    border: 'rgba(196,18,47,0.22)',
    text: '#F2B6C0',
  },
  strong: {
    bg: 'rgba(196,18,47,0.18)',
    border: 'rgba(196,18,47,0.32)',
    text: '#F8C4CC',
    glow: '0 0 12px rgba(196,18,47,0.25)',
  },
  elite: {
    bg: 'rgba(196,18,47,0.24)',
    border: 'rgba(196,18,47,0.4)',
    text: '#FFD4DB',
    glow: '0 0 16px rgba(196,18,47,0.35)',
  },
};

export interface TalentScoreBadgeProps {
  /** Talent score 0–10, or null when votes < 5 */
  score: number | null;
  /** Vote count – used to show "New" when < 5 */
  votesCount?: number;
  /** compact: inline pill | profile: stats bar | card: performance card | video: full video page */
  variant?: 'compact' | 'profile' | 'card' | 'video';
  className?: string;
}

export default function TalentScoreBadge({
  score,
  votesCount,
  variant = 'compact',
  className = '',
}: TalentScoreBadgeProps) {
  const state = getTalentScoreState(score, votesCount);
  const styles = STATE_STYLES[state];
  const showScore = score != null && state !== 'new';
  const label = showScore ? `${score.toFixed(1)}` : STATE_LABELS[state];

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${className}`}
        style={{
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          color: styles.text,
          boxShadow: styles.glow,
        }}
      >
        <span className="opacity-90" aria-hidden>⭐</span>
        {label}
      </span>
    );
  }

  if (variant === 'profile') {
    return (
      <div
        className={`flex items-center gap-2 rounded-[12px] px-3 py-2 ${className}`}
        style={{
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          boxShadow: styles.glow,
        }}
      >
        <span className="text-[14px] opacity-90" aria-hidden>⭐</span>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#9ba7b8' }}>
            Talent Score
          </span>
          <span className="text-[18px] font-semibold tabular-nums leading-none" style={{ color: styles.text }}>
            {showScore ? label : '—'}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <p className={`font-medium tracking-tight ${className}`} style={{ color: styles.text }}>
        <span className="opacity-90" aria-hidden>⭐ </span>
        {showScore ? `${label} Talent Score` : STATE_LABELS[state]}
      </p>
    );
  }

  if (variant === 'video') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[12px] font-semibold tabular-nums ${className}`}
        style={{
          background: styles.bg,
          border: `1px solid ${styles.border}`,
          color: styles.text,
          boxShadow: styles.glow,
        }}
      >
        <span className="opacity-90" aria-hidden>⭐</span>
        {showScore ? `${label} Talent Score` : STATE_LABELS[state]}
      </span>
    );
  }

  return null;
}

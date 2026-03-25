'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconStar } from '@/components/ui/Icons';
import { interpretApiResponse } from '@/lib/api-json-client';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export interface VoteButtonProps {
  videoId: string;
  /** Current user's vote (1–10) or null if not voted. */
  initialUserVote: number | null;
  initialVotesCount: number;
  initialTalentScore: number | null;
  onAuthRequired?: () => void;
  /** Called after successful vote; use to sync parent state. */
  onVoteSuccess?: (userVote: number, votesCount: number, talentScore: number | null) => void;
  /** 'inline' = star + count (cards); 'rail' = vertical stack (feed); 'button' = button style (modal/detail). */
  variant?: 'inline' | 'rail' | 'button';
  className?: string;
  stopPropagation?: boolean;
}

export default function VoteButton({
  videoId,
  initialUserVote,
  initialVotesCount,
  initialTalentScore,
  onAuthRequired,
  onVoteSuccess,
  variant = 'inline',
  className = '',
  stopPropagation = false,
}: VoteButtonProps) {
  const router = useRouter();
  const [userVote, setUserVote] = useState<number | null>(initialUserVote);
  const [votesCount, setVotesCount] = useState(initialVotesCount);
  const [talentScore, setTalentScore] = useState<number | null>(initialTalentScore);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    setUserVote(initialUserVote);
    setVotesCount(initialVotesCount);
    setTalentScore(initialTalentScore);
  }, [videoId, initialUserVote, initialVotesCount, initialTalentScore]);

  const handleAuthRequired = useCallback(() => {
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      const from = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
      router.push(`/login?from=${from}`);
    }
  }, [onAuthRequired, router]);

  const submitVote = useCallback(
    async (value: number) => {
      if (loading) return;
      const prevVote = userVote;
      const prevCount = votesCount;
      const prevScore = talentScore;
      const isNewVote = userVote === null;
      setUserVote(value);
      setVotesCount((c) => (isNewVote ? c + 1 : c));
      setLoading(true);
      setOpen(false);

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, value }),
        });
        const parsed = await interpretApiResponse<{
          userVote?: number;
          votesCount?: number;
          talentScore?: number | null;
        }>(res);

        if (parsed.status === 401) {
          setUserVote(prevVote);
          setVotesCount(prevCount);
          setTalentScore(prevScore);
          setVoteError(null);
          handleAuthRequired();
          return;
        }
        if (!parsed.ok) {
          setUserVote(prevVote);
          setVotesCount(prevCount);
          setTalentScore(prevScore);
          setVoteError(parsed.message);
          return;
        }
        const data = parsed.data;
        setVoteError(null);
        setUserVote(data.userVote ?? value);
        setVotesCount(typeof data.votesCount === 'number' ? data.votesCount : prevCount);
        setTalentScore(data.talentScore !== undefined ? data.talentScore : prevScore);
        onVoteSuccess?.(data.userVote ?? value, data.votesCount ?? prevCount, data.talentScore ?? null);
      } catch {
        setUserVote(prevVote);
        setVotesCount(prevCount);
        setTalentScore(prevScore);
        setVoteError('Could not submit vote. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [videoId, userVote, votesCount, talentScore, loading, onVoteSuccess, handleAuthRequired]
  );

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      if (stopPropagation) {
        e.preventDefault();
        e.stopPropagation();
      }
      setVoteError(null);
      setOpen((o) => !o);
    },
    [stopPropagation]
  );

  const hasVoted = userVote !== null;

  const picker = open && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="rounded-2xl border border-white/10 bg-[#0D0D0E] p-6 shadow-xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Rate this performance"
      >
        <p className="text-[15px] font-medium text-[#f5f5f5] mb-4">Rate this performance (1–10)</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => submitVote(n)}
              disabled={loading}
              className={`w-10 h-10 rounded-xl font-semibold text-[14px] transition-colors ${
                userVote === n
                  ? 'bg-accent text-white border border-accent'
                  : 'bg-white/10 text-[#f5f5f5] border border-white/10 hover:bg-white/20'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[#9ca3af] mt-4">Your vote updates the Talent Score.</p>
        {voteError ? (
          <p className="text-[12px] text-red-400 mt-3" role="alert">
            {voteError}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <>
        <div className="inline-flex items-center gap-1.5 shrink-0 min-h-[20px] relative">
          <button
            type="button"
            onClick={handleStarClick}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 shrink-0 min-h-[20px] text-accent hover:text-accent-hover transition-colors disabled:opacity-70 ${className}`}
            aria-label={hasVoted ? `You voted ${userVote}. Change vote` : 'Vote (1–10)'}
          >
            <IconStar className={`w-4 h-4 shrink-0 ${hasVoted ? 'fill-current' : ''}`} aria-hidden />
            <span className="tabular-nums font-medium text-[12px] text-[#f1f5f9]">{formatCount(votesCount)}</span>
          </button>
        </div>
        {picker}
      </>
    );
  }

  if (variant === 'rail') {
    return (
      <>
        <button
          type="button"
          onClick={handleStarClick}
          disabled={loading}
          className={`flex flex-col items-center gap-1 min-h-[44px] justify-center text-white/90 hover:text-white active:scale-95 transition-transform disabled:opacity-70 ${className}`}
          aria-label={hasVoted ? `You voted ${userVote} out of 10. Tap to change` : 'Vote 1 to 10'}
        >
          <IconStar className={`w-7 h-7 shrink-0 ${hasVoted ? 'fill-accent text-accent' : ''}`} aria-hidden />
          <span className="text-[11px] font-medium tabular-nums text-white/90">{formatCount(votesCount)}</span>
        </button>
        {picker}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleStarClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-[13px] min-h-[44px] transition-colors ${
          hasVoted
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-white/[0.03] text-white/85 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.09]'
        } disabled:opacity-70 ${className}`}
        aria-label={hasVoted ? `You voted ${userVote}. Change vote` : 'Vote (1–10)'}
      >
        <IconStar className={`w-5 h-5 shrink-0 ${hasVoted ? 'fill-current' : ''}`} aria-hidden />
        <span className="tabular-nums">{formatCount(votesCount)}</span>
        {talentScore != null && (
          <span className="text-[12px] text-white/60">· {talentScore.toFixed(1)}</span>
        )}
      </button>
      {picker}
    </>
  );
}

export { formatCount as formatVoteCount };

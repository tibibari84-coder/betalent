'use client';

import { useState } from 'react';
import { IconX } from '@/components/ui/Icons';
import { SUPER_VOTE_PACKAGES } from '@/constants/coins';

export const SUPER_VOTE_OPTIONS = (
  Object.entries(SUPER_VOTE_PACKAGES) as [string, number][]
).map(([votes, coins]) => ({ votes: Number(votes), coins }));

interface SuperVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  performerName: string;
  /** Called after successful super vote (e.g. refresh balance) */
  onSuccess?: (newBalance: number) => void;
}

export default function SuperVoteModal({
  isOpen,
  onClose,
  videoId,
  performerName,
  onSuccess,
}: SuperVoteModalProps) {
  const [selectedOption, setSelectedOption] = useState<(typeof SUPER_VOTE_OPTIONS)[number] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedOption) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}/super-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package: selectedOption.votes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Something went wrong');
        return;
      }
      setSuccess(true);
      onSuccess?.(data.newBalance);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedOption(null);
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalStyle = {
    width: '380px',
    maxWidth: 'calc(100vw - 32px)',
    background: 'rgba(18,22,31,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
  };

  const content = success ? (
    <div className="py-10 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-2xl">
        ⭐
      </div>
      <h3 className="font-display text-[18px] font-semibold text-white mb-2">
        Thank you for supporting this performer!
      </h3>
      <p className="text-[14px] text-white/60">
        Your vote boosts {performerName} in the challenge leaderboard.
      </p>
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 id="super-vote-title" className="font-display text-[17px] font-semibold text-white tracking-tight">
            Super Vote
          </h2>
          <p className="text-[13px] text-white/60 mt-0.5">
            Boost {performerName} in the challenge
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Close"
        >
          <IconX className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 pt-4">
        <p className="text-[13px] text-white/70 mb-4 px-1">
          Your vote boosts this performer in the challenge leaderboard.
        </p>

        <div className="space-y-3 mb-6">
          {SUPER_VOTE_OPTIONS.map((option) => (
            <button
              key={`${option.votes}-${option.coins}`}
              type="button"
              onClick={() => setSelectedOption(option)}
              className="w-full h-[80px] rounded-[14px] border flex items-center justify-between px-4 transition-all duration-200 hover:border-white/20 hover:shadow-[0_0_24px_rgba(255,255,255,0.08)]"
              style={{
                background: selectedOption?.votes === option.votes ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                borderColor: selectedOption?.votes === option.votes ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-[18px] font-semibold text-white">
                {option.votes} vote{option.votes > 1 ? 's' : ''}
              </span>
              <span className="text-[15px] font-medium text-white/70 tabular-nums">
                {option.coins} coins
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-[13px] text-red-400/90 mb-3" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedOption || submitting}
          className="w-full h-[42px] rounded-[12px] font-semibold text-[15px] text-white bg-[#b11226] hover:bg-[#9a0f21] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? 'Voting…' : selectedOption ? `Cast ${selectedOption.votes} vote${selectedOption.votes > 1 ? 's' : ''} (${selectedOption.coins} coins)` : 'Choose an option'}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-vote-title"
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        style={modalStyle}
      >
        {content}
      </div>
    </>
  );
}

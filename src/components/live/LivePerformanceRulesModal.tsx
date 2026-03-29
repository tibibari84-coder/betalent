'use client';

import { IconX } from '@/components/ui/Icons';

interface LivePerformanceRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const RULES = [
  'No playback — perform during your slot, not a recording',
  'Use your real voice for the performance',
  'Camera must be active for the arena format',
];

export default function LivePerformanceRulesModal({ isOpen, onClose, onAccept }: LivePerformanceRulesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.08] p-6 transition-all duration-200"
        style={{
          background: 'linear-gradient(180deg, rgba(26,26,28,0.98) 0%, rgba(18,18,22,0.99) 100%)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[20px] font-semibold text-text-primary">Arena performance rules</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <ul className="space-y-3 mb-6">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-center gap-3 text-[15px] text-text-secondary">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent text-[12px] font-semibold">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <p className="text-[13px] text-text-muted mb-6">
          By continuing, you confirm your performance is authentic. Sessions are part of the scheduled live challenge
          show (not a separate broadcast platform). Submissions may be reviewed; violations may result in removal or
          account restrictions.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-text-secondary hover:bg-white/5 transition-colors text-[14px] font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-accent text-white font-medium text-[14px] hover:bg-accent/90 transition-colors"
          >
            Accept &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}

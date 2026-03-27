import Link from 'next/link';

type FeedEmptyStateProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
};

/**
 * Premium empty state for public feeds when there are no READY performances.
 * No fake cards — only real content or this state.
 */
export function FeedEmptyState({
  title = 'No performances yet',
  description = 'Be the first to share your talent. Upload a performance to appear here.',
  ctaLabel = 'Upload Performance',
  ctaHref = '/upload',
  compact = false,
}: FeedEmptyStateProps) {
  return (
    <div className={`relative isolate w-full overflow-hidden rounded-[28px] border border-white/[0.08] ${compact ? 'min-h-[320px]' : 'min-h-[78dvh]'}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 8%, rgba(196,18,47,0.2) 0%, rgba(196,18,47,0.07) 32%, transparent 72%), radial-gradient(80% 44% at 80% 86%, rgba(135,38,52,0.16) 0%, transparent 70%), linear-gradient(180deg, rgba(10,9,13,0.96) 0%, rgba(5,5,8,0.98) 100%)',
        }}
      />
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[68%] h-56 rounded-full blur-3xl opacity-45 bg-[rgba(196,18,47,0.26)] animate-pulse" />

      <div className="relative z-[2] flex h-full flex-col justify-between px-5 py-6 sm:px-7 sm:py-8">
        <section className="space-y-5 pt-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-3 py-1 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/58">
            No performances yet
          </div>
          <div className="max-w-[34rem] space-y-3">
            <h3 className="text-white font-display font-semibold tracking-tight text-[1.65rem] sm:text-[2rem] leading-[1.08]">
              {title}
            </h3>
            <p className="text-white/62 text-[14px] sm:text-[15px] leading-relaxed max-w-[30rem]">
              {description}
            </p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] px-7 py-3.5 text-[15px] font-semibold text-white border border-[#f36] shadow-[0_0_26px_rgba(196,18,47,0.35)] transition-all [@media(hover:hover)]:hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #e11840 0%, #b10f2e 100%)' }}
          >
            {ctaLabel}
          </Link>
        </section>

        <section className="pt-7 sm:pt-9">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/34 mb-3">Upcoming in this feed</div>
          <div className="relative h-[190px] sm:h-[220px]">
            <div className="absolute inset-y-6 right-[16%] w-[50%] rounded-[20px] border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm opacity-55 rotate-[4deg]" />
            <div className="absolute inset-y-3 left-[8%] w-[52%] rounded-[20px] border border-white/[0.11] bg-white/[0.035] backdrop-blur-sm opacity-72 -rotate-[5deg]" />
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[58%] rounded-[22px] border border-white/[0.13] bg-gradient-to-b from-white/[0.06] to-white/[0.015] backdrop-blur-md shadow-[0_22px_50px_rgba(0,0,0,0.45)]">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="h-2.5 w-20 rounded-full bg-white/20" />
                <div className="h-2.5 w-28 rounded-full bg-white/15" />
                <div className="h-20 sm:h-24 rounded-xl bg-gradient-to-br from-white/[0.1] via-white/[0.05] to-transparent" />
                <div className="h-2.5 w-24 rounded-full bg-white/16" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

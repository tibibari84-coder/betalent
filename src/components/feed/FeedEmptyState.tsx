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
    <div
      className={`flex flex-col items-center justify-center text-center px-4 ${
        compact ? 'min-h-[200px] py-10' : 'min-h-[280px] py-12'
      }`}
    >
      <p className={`font-semibold text-text-primary mb-2 ${compact ? 'text-[16px]' : 'text-[18px]'}`}>
        {title}
      </p>
      <p className={`text-text-secondary mb-6 max-w-[360px] ${compact ? 'text-[14px]' : 'text-[15px]'}`}>
        {description}
      </p>
      <Link
        href={ctaHref}
        className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[12px]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

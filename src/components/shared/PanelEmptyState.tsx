import Link from 'next/link';

type PanelEmptyStateProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: React.ReactNode;
};

/**
 * Premium empty state for right panel modules (Trending, Suggested, etc.).
 * Never raw "no data" — always intentional, guided, premium.
 */
export function PanelEmptyState({
  title = 'Nothing here yet',
  description = 'When performances and creators gain traction, they’ll appear here.',
  ctaLabel = 'Explore',
  ctaHref = '/explore',
  icon,
}: PanelEmptyStateProps) {
  return (
    <div className="py-6 px-2 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/40">
          {icon}
        </div>
      )}
      <p className="text-[13px] font-medium text-white/80 mb-1">{title}</p>
      <p className="text-[13px] text-white/50 mb-4 max-w-[180px] mx-auto leading-snug">{description}</p>
      <Link
        href={ctaHref}
        className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

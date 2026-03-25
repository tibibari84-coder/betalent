'use client';

type BadgeVariant = 'starter' | 'rising' | 'featured' | 'trending' | 'new';

/** Pill badge: fix height, line-height 1, nowrap + ellipsis so text never breaks layout. */
const variantStyles: Record<BadgeVariant, string> = {
  starter:
    'text-[#cbd5e1] bg-[rgba(255,255,255,0.05)] border border-white/[0.08]',
  rising:
    'text-[#ff6b6b] bg-[rgba(255,80,80,0.1)] border border-[rgba(255,80,80,0.4)]',
  featured:
    'text-[#f5c542] bg-[rgba(245,197,66,0.15)] border border-[rgba(245,197,66,0.4)]',
  trending:
    'text-[#f5f5f5] bg-[rgba(196,18,47,0.2)] border border-[rgba(196,18,47,0.35)]',
  new: 'text-white bg-accent border border-accent',
};

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
  /** Compact card header: 24px height, 10px padding; otherwise 26px, 12px padding */
  compactCard?: boolean;
}

export default function Badge({ variant, children, className = '', compactCard }: BadgeProps) {
  const labels: Record<BadgeVariant, string> = {
    starter: 'Starter Talent',
    rising: 'Rising Talent',
    featured: 'Featured Talent',
    trending: 'Trending',
    new: 'New',
  };

  const sizeClass = compactCard
    ? 'h-5 min-h-5 max-w-[72px] px-2 rounded-full text-[11px]'
    : 'h-[26px] min-h-[26px] max-w-[110px] px-3 rounded-full text-[12px]';

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold leading-none border shrink-0 overflow-hidden text-ellipsis whitespace-nowrap min-w-0 ${sizeClass} ${variantStyles[variant]} ${className}`}
    >
      {children ?? labels[variant]}
    </span>
  );
}

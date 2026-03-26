import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

const MARK_SIZES =
  'h-[20px] w-[20px] md:h-[22px] md:w-[22px] lg:h-[24px] lg:w-[24px] shrink-0 object-contain';
const LOCKUP_GAP = 'gap-2 lg:gap-[10px]';

/**
 * Circular neon mark + BETALENT wordmark. Sizes: 18 / 20 / 22px; gap 8px (md) / 10px (lg+).
 */
export function BrandMarkImage({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <img
      src="/brand/betalent-mark.png"
      alt=""
      width={22}
      height={22}
      className={cn(MARK_SIZES, className)}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}

export function BrandMarkLockupNav({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center leading-none', LOCKUP_GAP, className)}>
      <BrandMarkImage />
      {children}
    </span>
  );
}

/** Auth chrome: same mark sizes + spacing as nav; optional subtitle aligned to wordmark column. */
export function BrandMarkLockupAuth({
  subtitle,
  className,
}: {
  subtitle: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className={cn('inline-flex min-w-0 items-center leading-none', LOCKUP_GAP)}>
        <BrandMarkImage priority />
        <BrandWordmark variant="auth" className="text-[26px] sm:text-[30px]" />
      </div>
      <div className="mt-1 pl-[calc(18px+8px)] md:pl-[calc(20px+8px)] lg:pl-[calc(22px+10px)] text-[11px] sm:text-[12px] tracking-[0.24em] text-text-muted/80 uppercase">
        {subtitle}
      </div>
    </div>
  );
}

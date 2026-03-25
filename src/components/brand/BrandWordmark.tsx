import type { CSSProperties, ElementType } from 'react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/constants/app';
import { accentAlpha } from '@/constants/accent-tokens';

/**
 * Luxury uppercase wordmark — always renders {@link APP_NAME} (BETALENT) with display typography.
 */
export type BrandWordmarkVariant = 'hero' | 'nav' | 'auth' | 'inline' | 'footer';

const VARIANT_STYLES: Record<BrandWordmarkVariant, string> = {
  hero:
    'font-display font-semibold uppercase tracking-[0.18em] text-[clamp(1.25rem,3vw,1.5rem)] animate-fade-in',
  nav: 'truncate font-display font-semibold leading-none tracking-[0.12em] uppercase text-[#F5F7FA]',
  auth: 'font-display font-semibold uppercase tracking-[0.14em] leading-none text-[#f5f5f5]',
  inline: 'font-display font-semibold uppercase tracking-[0.1em] align-baseline text-current',
  footer:
    'font-display font-semibold uppercase tracking-[0.14em] text-[14px] desktop:text-[15px] leading-tight',
};

export function BrandWordmark({
  variant = 'inline',
  className,
  style,
  as,
  'aria-label': ariaLabel,
}: {
  variant?: BrandWordmarkVariant;
  className?: string;
  style?: CSSProperties;
  /** Default: span; use <p> for block contexts if needed */
  as?: ElementType;
  'aria-label'?: string;
}) {
  const Component = (as ?? 'span') as ElementType;
  const mergedStyle: CSSProperties =
    variant === 'hero'
      ? {
          color: accentAlpha(0.92),
          textShadow: `0 0 20px ${accentAlpha(0.15)}`,
          ...style,
        }
      : { ...style };

  return (
    <Component className={cn(VARIANT_STYLES[variant], className)} style={mergedStyle} aria-label={ariaLabel}>
      {APP_NAME}
    </Component>
  );
}

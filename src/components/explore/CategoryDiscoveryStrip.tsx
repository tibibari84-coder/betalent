'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { VOCAL_STYLES } from '@/constants/categories';
import { CARD_BASE_STYLE, CARD_ACTIVE_STYLE } from '@/constants/card-design-system';

export function CategoryDiscoveryStrip() {
  const searchParams = useSearchParams();
  const currentStyle = searchParams?.get('style') ?? '';

  return (
    <section className="mb-5 laptop:mb-6 min-w-0">
      <div className="relative -mx-[var(--layout-pad,16px)] tablet:mx-0 min-w-0">
        <div
          className="flex gap-2.5 overflow-x-auto overflow-y-hidden pb-2.5 scroll-smooth snap-x snap-mandatory px-[var(--layout-pad,16px)] tablet:px-0 scrollbar-thin"
          style={{ scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          role="tablist"
          aria-label="Vocal style categories"
        >
          {VOCAL_STYLES.map((style) => {
            const isActive = (style.slug === '' && currentStyle === '') || style.slug === currentStyle;
            return (
              <Link
                key={style.slug || 'all'}
                href={style.slug ? `/explore?style=${encodeURIComponent(style.slug)}` : '/explore'}
                className={`
                  flex-shrink-0 snap-start rounded-[16px] px-4 py-2.5 text-[14px] font-medium transition-all duration-300 ease-out
                  whitespace-nowrap
                  ${isActive ? 'text-white/92' : 'text-white/65 hover:text-white/92 active:scale-[0.98]'}
                `}
                style={isActive ? CARD_ACTIVE_STYLE : CARD_BASE_STYLE}
                role="tab"
                aria-selected={isActive}
              >
                {style.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

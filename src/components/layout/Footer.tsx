import Link from 'next/link';
import { APP_SLOGAN, ROUTES } from '@/constants/app';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

const FOOTER_LINKS = [
  { href: ROUTES.ABOUT, label: 'About', ariaLabel: 'Learn about BETALENT' },
  { href: ROUTES.TERMS, label: 'Terms', ariaLabel: 'Terms of Service' },
  { href: ROUTES.PRIVACY, label: 'Privacy', ariaLabel: 'Privacy Policy' },
  { href: ROUTES.REFUND, label: 'Refund', ariaLabel: 'Refund Policy' },
  { href: ROUTES.CONTACT, label: 'Contact', ariaLabel: 'Contact us' },
] as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-[rgba(255,255,255,0.05)]"
      style={{ background: '#0F1012' }}
    >
      <div
        className="py-3.5 min-w-0 overflow-hidden"
        style={{
          paddingLeft: 'var(--layout-pad, 16px)',
          paddingRight: 'var(--layout-pad, 16px)',
          maxWidth: '1788px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Main row: brand + tagline left, links right */}
        <div className="flex flex-col gap-2.5 tablet:flex-row tablet:items-center tablet:justify-between tablet:gap-8">
          <div className="min-w-0 shrink-0">
            <BrandWordmark variant="footer" style={{ color: 'rgba(255,255,255,0.9)' }} />
            <p
              className="text-[12px] desktop:text-[13px] leading-snug mt-0.5"
              style={{ color: 'rgba(255,255,255,0.65)' }}
            >
              {APP_SLOGAN}
            </p>
          </div>

          <nav
            aria-label="Legal and information links"
            className="flex flex-wrap gap-x-4 desktop:gap-x-5 gap-y-1 min-w-0"
          >
            {FOOTER_LINKS.map(({ href, label, ariaLabel }) => (
              <Link
                key={href}
                href={href}
                aria-label={ariaLabel}
                className="text-[13px] text-white/65 hover:text-white/85 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0F1012] rounded"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Copyright — small, subtle */}
        <p
          className="mt-2.5 pt-2.5 border-t border-[rgba(255,255,255,0.04)] text-[11px] desktop:text-[12px] text-center tablet:text-left"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          suppressHydrationWarning
        >
          © {currentYear}{' '}
          <BrandWordmark variant="inline" className="text-[11px] desktop:text-[12px] tracking-[0.12em]" /> — The
          global digital stage for talent.
        </p>
      </div>
    </footer>
  );
}

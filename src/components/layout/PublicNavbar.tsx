'use client';

/**
 * Guest-only top bar: brand, discovery search, sign-in / register.
 * No notifications, wallet rail, or account menu (those belong to the authenticated app shell).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconSearch } from '@/components/ui/Icons';
import { APP_NAME } from '@/constants/app';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { BrandMarkLockupNav } from '@/components/brand/BrandMarkLockup';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { cn } from '@/lib/utils';

const BTN_PRIMARY =
  'inline-flex items-center justify-center min-h-[42px] px-4 rounded-[12px] text-[13px] font-semibold text-white bg-gradient-to-b from-[#d41936] to-[#9b0e24] border border-white/10 shadow-[0_4px_16px_rgba(196,18,47,0.25)] hover:from-[#e01e3d] hover:to-[#b01028] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(196,18,47,0.55)]';
const BTN_GHOST =
  'inline-flex items-center justify-center min-h-[42px] px-4 rounded-[12px] text-[13px] font-medium text-white/90 border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/25';

export default function PublicNavbar() {
  const router = useRouter();
  const { t } = useI18n();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchRef.current?.value?.trim();
    if (q) {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/explore');
    }
  }

  function handleMobileSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    handleSearchSubmit(e);
    setMobileSearchOpen(false);
  }

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSearchOpen]);

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(10, 10, 12, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="mx-auto w-full min-w-0 max-w-[var(--shell-max-width)]"
        style={{
          paddingLeft: 'var(--topbar-pad-x)',
          paddingRight: 'var(--topbar-pad-x)',
        }}
      >
        {/* Mobile/tablet: row 1 brand/actions, row 2 search (sm+) */}
        <div className="md:hidden w-full min-w-0 py-1.5">
          <div className="grid h-[var(--topbar-height)] w-full min-w-0 items-center gap-x-2 grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/landing"
                aria-label={APP_NAME}
                className="group inline-flex min-w-0 max-w-[min(64vw,236px)] items-center rounded-lg py-0.5 text-[17px] transition-opacity duration-200 hover:opacity-95"
              >
                <BrandMarkLockupNav>
                  <BrandWordmark variant="nav" className="truncate" />
                </BrandMarkLockupNav>
              </Link>
            </div>
            <nav aria-label="Sign in and discovery" className="flex shrink-0 items-center justify-end gap-1.5 min-w-0 sm:gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="inline-flex p-2 rounded-xl text-white/85 hover:bg-white/[0.07]"
                aria-label={t('topbar.searchPlaceholder')}
                aria-haspopup="dialog"
                aria-expanded={mobileSearchOpen}
              >
                <IconSearch className="w-5 h-5" />
              </button>
              <LanguageSelector compact align="right" className="shrink-0" />
              <Link href="/login" className={BTN_GHOST}>
                {t('auth.signIn')}
              </Link>
              <Link href="/register" className={BTN_PRIMARY}>
                {t('auth.createAccount')}
              </Link>
            </nav>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex h-[var(--topbar-height)] w-full min-w-0 items-center gap-3" style={{ columnGap: 'var(--layout-gap, 24px)' }}>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <Link
              href="/landing"
              aria-label={APP_NAME}
              className="group inline-flex min-w-0 items-center rounded-lg py-0.5 text-[17px] sm:text-[18px] transition-opacity duration-200 hover:opacity-95"
            >
              <BrandMarkLockupNav>
                <BrandWordmark variant="nav" />
              </BrandMarkLockupNav>
            </Link>
          </div>

          <div className="flex flex-1 min-w-0 items-center justify-center px-1 sm:px-3">
            <form onSubmit={handleSearchSubmit} role="search" className="w-full min-w-0 max-w-[min(100%,520px)] mx-auto">
              <div
                className="relative w-full h-[38px] rounded-[10px] overflow-hidden transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: searchFocused
                    ? '0 0 0 1px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.04)'
                    : 'none',
                }}
              >
                <IconSearch
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  name="q"
                  type="search"
                  placeholder={t('topbar.searchPlaceholder')}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="h-full w-full min-w-0 bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus-visible:ring-0"
                />
              </div>
            </form>
          </div>

          <nav aria-label="Sign in and discovery" className={cn('flex shrink-0 items-center justify-end gap-2 sm:gap-3 min-w-0')}>
            <Link
              href="/explore"
              className="hidden lg:inline-flex text-[13px] font-medium text-white/70 hover:text-white transition-colors px-1"
            >
              Explore
            </Link>
            <Link
              href="/challenges"
              className="hidden lg:inline-flex text-[13px] font-medium text-white/70 hover:text-white transition-colors px-1"
            >
              Challenges
            </Link>
            <a
              href="/api/auth/google"
              className="hidden lg:inline-flex items-center justify-center min-h-[42px] px-3.5 rounded-[12px] text-[12px] font-medium text-white/75 border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/25"
              title="Continue with Google"
            >
              Google
            </a>
            <LanguageSelector compact align="right" className="shrink-0" />
            <Link href="/login" className={BTN_GHOST}>
              {t('auth.signIn')}
            </Link>
            <Link href="/register" className={BTN_PRIMARY}>
              {t('auth.createAccount')}
            </Link>
          </nav>
        </div>
      </div>
      {mobileSearchOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[620] bg-black/55 backdrop-blur-[2px]"
              onClick={() => setMobileSearchOpen(false)}
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t('topbar.searchPlaceholder')}
                className="mx-auto w-full max-w-[var(--shell-max-width)]"
                style={{
                  paddingTop: 'max(8px, env(safe-area-inset-top))',
                  paddingLeft: 'var(--topbar-pad-x)',
                  paddingRight: 'var(--topbar-pad-x)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="rounded-[14px] border border-white/[0.08] p-2.5"
                  style={{
                    background: 'rgba(18,18,22,0.96)',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.45)',
                  }}
                >
                  <form onSubmit={handleMobileSearchSubmit} role="search" className="w-full min-w-0">
                    <div
                      className="relative w-full h-[36px] rounded-[10px] overflow-hidden transition-all duration-200"
                      style={{
                        maxWidth: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: searchFocused
                          ? '0 0 0 1px rgba(255,255,255,0.1), 0 0 20px rgba(255,255,255,0.04)'
                          : 'none',
                      }}
                    >
                      <IconSearch
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] shrink-0 text-[#6b7280]"
                        aria-hidden
                      />
                      <input
                        ref={searchRef}
                        name="q"
                        type="search"
                        placeholder={t('topbar.searchPlaceholder')}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="h-full w-full min-w-0 bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus-visible:ring-0"
                      />
                    </div>
                  </form>
                  <button
                    type="button"
                    onClick={() => setMobileSearchOpen(false)}
                    className="mt-2 w-full rounded-[10px] border border-white/[0.1] py-2 text-[13px] font-medium text-white/80 hover:bg-white/[0.06]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </header>
  );
}

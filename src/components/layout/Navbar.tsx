'use client';

/**
 * Topbar shell: max-width matches RootShell; padding via --topbar-pad-x (16/20/24/32px).
 * Desktop grid: 260px | centered search (≤520px) | 280px — trophy, bell, chat, avatar.
 */

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  IconSearch,
  IconUser,
  IconTrophy,
  IconMenu,
  IconUsers,
  IconSettings,
  IconCoins,
} from '@/components/ui/Icons';
import NotificationsBell from '@/components/notifications/NotificationsBell';
import { ChatNavButton } from '@/components/chat/ChatNavButton';
import { APP_NAME } from '@/constants/app';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { BrandMarkLockupNav } from '@/components/brand/BrandMarkLockup';
import { useI18n } from '@/contexts/I18nContext';
import { useChatPanel } from '@/contexts/ChatPanelContext';
import { cn } from '@/lib/utils';

type NavUser = {
  username: string;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

/** Closed vs open with anchor position (single setState — no frame where open but position is null). */
type ProfileMenuState = { open: false } | { open: true; top: number; left: number; width: number };

/** Below modals (e.g. avatar crop z-400); above notifications popover (z-100). */
const PROFILE_MENU_Z = 600;
const PROFILE_MENU_WIDTH_DESKTOP = 280;
const PROFILE_MENU_WIDTH_MOBILE = 220;

const TOPBAR_TRANSITION = 'transition-all duration-150 ease-out';
const ICON_BTN =
  'inline-flex items-center justify-center shrink-0 h-[var(--utility-btn-size)] w-[var(--utility-btn-size)] min-h-[var(--utility-btn-size)] min-w-[var(--utility-btn-size)] rounded-[10px] text-white/80 hover:text-white/95 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98] ' +
  TOPBAR_TRANSITION +
  ' focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const HAMBURGER_BTN =
  'flex items-center justify-center shrink-0 h-[var(--utility-btn-size)] w-[var(--utility-btn-size)] -ml-1 rounded-[10px] text-white/80 hover:text-white hover:bg-white/[0.06] ' +
  TOPBAR_TRANSITION +
  ' focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10';
const UTIL_ROW = 'flex items-center justify-end gap-[var(--utility-gap)] shrink-0 min-w-0';
const AVATAR_RING =
  'flex items-center justify-center overflow-hidden shrink-0 rounded-full bg-white/10 ring-1 ring-white/10 ' +
  TOPBAR_TRANSITION +
  ' group-hover:ring-white/20';
const SEARCH_BOX = cn(
  'relative w-full h-[36px] rounded-[10px] overflow-hidden bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.05]',
  TOPBAR_TRANSITION
);

function TopbarSearchForm({
  maxClass,
  placeholder,
  onSubmit,
}: {
  maxClass: string;
  placeholder: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <form onSubmit={onSubmit} role="search" className={cn('group mx-auto w-full min-w-0', maxClass, TOPBAR_TRANSITION)}>
      <div
        className={cn(SEARCH_BOX, focused && 'border-white/[0.08] bg-white/[0.05]')}
        style={{
          boxShadow: focused
            ? '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.04)'
            : 'inset 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <IconSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0 text-[#6b7280]"
          aria-hidden
        />
        <input
          name="q"
          type="search"
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-full w-full bg-transparent pl-9 pr-3 text-[13px] text-[#E5E7EB] placeholder:text-[#6b7280] focus:outline-none focus:ring-0 focus-visible:outline-none"
        />
      </div>
    </form>
  );
}

export default function Navbar({
  onOpenDrawer,
  initialAuthUser,
  isAuthenticatedShell = false,
}: {
  onOpenDrawer?: () => void;
  initialAuthUser?: { username: string; email?: string | null } | null;
  isAuthenticatedShell?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { openPanel: openMessagesPanel } = useChatPanel();
  const profileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuPanelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<NavUser | null | 'loading'>(
    initialAuthUser?.username
      ? {
          username: initialAuthUser.username,
          email: initialAuthUser.email ?? null,
          displayName: null,
          avatarUrl: null,
        }
      : isAuthenticatedShell
        ? 'loading'
        : 'loading'
  );
  const [profileMenu, setProfileMenu] = useState<ProfileMenuState>({ open: false });
  const [mobileTopbarPanel, setMobileTopbarPanel] = useState<'profile' | 'notifications' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isDesktopTopbar, setIsDesktopTopbar] = useState(false);

  const isImmersiveFeedRoute = pathname === '/feed';
  const isSettingsRoute = pathname === '/settings' || (pathname?.startsWith('/settings/') ?? false);
  const hideGlobalRightPanel = isImmersiveFeedRoute || isSettingsRoute;
  const isChallengesRoute = pathname === '/challenges' || (pathname?.startsWith('/challenges/') ?? false);

  /** Required before createPortal(document.body) — keeps SSR safe and unlocks the profile menu on the client. */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user?.username) {
          setUser({
            username: data.user.username,
            displayName: data.user.displayName ?? null,
            email: data.user.email ?? null,
            avatarUrl: data.user.avatarUrl ?? null,
          });
        } else {
          setUser((prev) => (isAuthenticatedShell ? (prev === 'loading' ? null : prev) : null));
        }
      })
      .catch(() => setUser((prev) => (isAuthenticatedShell ? prev : null)));
  }, [isAuthenticatedShell]);

  function getProfileMenuWidth(): number {
    if (typeof window === 'undefined') return PROFILE_MENU_WIDTH_DESKTOP;
    if (window.innerWidth < 640) {
      // Meta/Facebook-like compact popover on mobile.
      return Math.max(176, Math.min(PROFILE_MENU_WIDTH_MOBILE, window.innerWidth - 12));
    }
    return PROFILE_MENU_WIDTH_DESKTOP;
  }

  function menuLeftFromButtonRect(r: DOMRect, width: number): number {
    const preferred = r.right - width;
    const edge = window.innerWidth < 640 ? 6 : 8;
    const min = edge;
    const max = Math.max(min, window.innerWidth - width - edge);
    return Math.max(min, Math.min(max, preferred));
  }

  function updateProfileMenuAnchor() {
    const btn = profileMenuButtonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = getProfileMenuWidth();
    setProfileMenu({
      open: true,
      top: r.bottom + 6,
      left: menuLeftFromButtonRect(r, width),
      width,
    });
  }

  useLayoutEffect(() => {
    if (!profileMenu.open) return;
    const onScrollOrResize = () => updateProfileMenuAnchor();
    onScrollOrResize();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [profileMenu.open]);

  /** Defer outside listener so the same click that opens the menu does not close it (capture-phase pitfalls). */
  useEffect(() => {
    if (!profileMenu.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (profileMenuButtonRef.current?.contains(t) || profileMenuPanelRef.current?.contains(t)) return;
      setProfileMenu({ open: false });
    };
    let frame = 0;
    frame = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', onPointerDown);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [profileMenu.open]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!profileMenu.open && mobileTopbarPanel === 'profile') {
      setMobileTopbarPanel(null);
    }
    if (mobileTopbarPanel !== 'profile' && profileMenu.open) {
      setProfileMenu({ open: false });
    }
  }, [mobileTopbarPanel, profileMenu.open]);

  useEffect(() => {
    if (!profileMenu.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenu({ open: false });
        profileMenuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileMenu.open]);

  useEffect(() => {
    if (!profileMenu.open) return;
    const frame = requestAnimationFrame(() => {
      const items = profileMenuPanelRef.current?.querySelectorAll<HTMLElement>('[data-account-menu-item]');
      items?.[0]?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [profileMenu.open]);

  useEffect(() => {
    setProfileMenu({ open: false });
    setMobileTopbarPanel(null);
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktopTopbar(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  function closeProfileMenu() {
    setProfileMenu({ open: false });
    setMobileTopbarPanel((p) => (p === 'profile' ? null : p));
  }

  function toggleProfileMenu() {
    const nextPanel = mobileTopbarPanel === 'profile' ? null : 'profile';
    setMobileTopbarPanel(nextPanel);
    setProfileMenu((m) => {
      if (m.open || nextPanel !== 'profile') return { open: false };
      const btn = profileMenuButtonRef.current;
      if (btn) {
        const r = btn.getBoundingClientRect();
        const width = getProfileMenuWidth();
        return {
          open: true,
          top: r.bottom + 10,
          left: menuLeftFromButtonRect(r, width),
          width,
        };
      }
      return { open: true, top: 72, left: 8, width: PROFILE_MENU_WIDTH_DESKTOP };
    });
  }

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      profileMenuPanelRef.current?.querySelectorAll<HTMLElement>('[data-account-menu-item]') ?? []
    );
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const idx = current ? items.indexOf(current) : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  async function handleSignOut() {
    closeProfileMenu();
    setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget.elements.namedItem('q');
    const q = el && 'value' in el ? String(el.value).trim() : '';
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

  const MENU_ICON = 'w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0 text-white/50';
  const profileMenuDropdown =
    profileMenu.open && mounted ? (
      createPortal(
        <div
          ref={profileMenuPanelRef}
          id="navbar-profile-menu"
          role="menu"
          className="premium-dropdown-enter fixed rounded-2xl overflow-hidden pointer-events-auto origin-top-right"
          style={{
            top: profileMenu.top,
            left: profileMenu.left,
            width: profileMenu.width,
            maxWidth: 'min(calc(100vw - 16px), 280px)',
            zIndex: PROFILE_MENU_Z,
            background: 'rgba(20,20,24,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          onKeyDown={onMenuKeyDown}
        >
          <div className="px-2.5 py-2 border-b border-white/[0.08] min-w-0 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 shrink-0">
              {user && user !== 'loading' && user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
              ) : (
                <IconUser className="w-[12px] h-[12px] text-white/75" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className="text-[12.5px] font-semibold text-white truncate"
                title={user && user !== 'loading' ? (user.displayName?.trim() || user.username) : undefined}
              >
                {user && user !== 'loading' ? user.displayName?.trim() || user.username : ''}
              </p>
              <p
                className="text-[11px] text-white/55 truncate"
                title={user && user !== 'loading' ? (user.email || `@${user.username}`) : undefined}
              >
                {user && user !== 'loading' ? user.email || `@${user.username}` : ''}
              </p>
            </div>
          </div>
          <div className="py-1.5">
            <Link
              href="/profile/me"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium text-white rounded-xl mx-1 transition-all duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
              onClick={closeProfileMenu}
            >
              <IconUsers className={MENU_ICON} aria-hidden />
              {t('nav.profile')}
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium text-white rounded-xl mx-1 transition-all duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
              onClick={closeProfileMenu}
            >
              <IconSettings className={MENU_ICON} aria-hidden />
              {t('nav.settings')}
            </Link>
            <Link
              href="/challenges"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium text-white rounded-xl mx-1 transition-all duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
              onClick={closeProfileMenu}
            >
              <IconTrophy className={MENU_ICON} aria-hidden />
              {t('topbar.challenges')}
            </Link>
            <button
              type="button"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              className={cn(
                'flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[12px] font-medium text-white rounded-xl mx-1 transition-all duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
              onClick={() => {
                closeProfileMenu();
                openMessagesPanel();
              }}
            >
              <IconUser className={MENU_ICON} aria-hidden />
              {t('topbar.messages')}
            </button>
            <Link
              href="/wallet"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 text-[12px] font-medium text-white rounded-xl mx-1 transition-all duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
              onClick={closeProfileMenu}
            >
              <IconCoins className={MENU_ICON} aria-hidden />
              {t('nav.wallet')}
            </Link>
          </div>
          <div className="border-t border-white/[0.06] py-1.5">
            <button
              type="button"
              role="menuitem"
              data-account-menu-item
              tabIndex={0}
              onClick={() => {
                void handleSignOut();
              }}
              className={cn(
                'w-full mx-1 rounded-xl px-2.5 py-2 text-left text-[12px] font-medium text-red-400/95 transition-all duration-150 ease-out hover:bg-red-500/10 active:scale-[0.97]',
                TOPBAR_TRANSITION
              )}
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>,
        document.body
      )
    ) : null;

  const accountMenuTrigger =
    user && user !== 'loading' ? (
      <div className="relative flex shrink-0 items-center">
        <button
          ref={profileMenuButtonRef}
          type="button"
          onClick={toggleProfileMenu}
          className={cn(ICON_BTN, 'group')}
          aria-label={t('topbar.profile')}
          aria-expanded={profileMenu.open}
          aria-haspopup="menu"
          aria-controls={profileMenu.open ? 'navbar-profile-menu' : undefined}
        >
          <span
            className={cn(
              AVATAR_RING,
              'w-[var(--avatar-topbar)] h-[var(--avatar-topbar)] min-w-[var(--avatar-topbar)] min-h-[var(--avatar-topbar)]'
            )}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
            ) : (
              <IconUser className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
            )}
          </span>
        </button>
        {profileMenuDropdown}
      </div>
    ) : null;

  const loginOrLoading = isAuthenticatedShell ? (
    <>
      {user === 'loading' && (
        <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
          <IconUser className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
        </span>
      )}
    </>
  ) : (
    <>
      {user === 'loading' && (
        <span className={cn(ICON_BTN, 'pointer-events-none text-white/35')} aria-hidden>
          <IconUser className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
        </span>
      )}
      {user === null && (
        <Link href="/login" className={cn(ICON_BTN, 'group')} aria-label={t('topbar.profile')}>
          <span
            className={cn(
              AVATAR_RING,
              'w-[var(--avatar-topbar)] h-[var(--avatar-topbar)] min-w-[var(--avatar-topbar)] min-h-[var(--avatar-topbar)]'
            )}
          >
            <IconUser className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
          </span>
        </Link>
      )}
    </>
  );

  const utilities = () => (
    <>
      <Link
        href="/challenges"
        className={cn(
          ICON_BTN,
          'hidden sm:inline-flex',
          isChallengesRoute && 'text-white bg-white/[0.08] ring-1 ring-white/[0.12]'
        )}
        aria-label={t('topbar.challenges')}
        aria-current={isChallengesRoute ? 'page' : undefined}
      >
        <IconTrophy className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
      </Link>
      <div className="flex shrink-0 items-center justify-center [&_*]:min-w-0">
        <NotificationsBell
          isOpen={mobileTopbarPanel === 'notifications'}
          onOpenChange={(open) => {
            setMobileTopbarPanel(open ? 'notifications' : null);
            if (open) setProfileMenu({ open: false });
          }}
        />
      </div>
      {user && user !== 'loading' ? <div className="hidden sm:flex"><ChatNavButton /></div> : null}
      {accountMenuTrigger}
      {loginOrLoading}
    </>
  );

  return (
    <header
      role="banner"
      className={cn('sticky top-0 z-50 w-full', TOPBAR_TRANSITION)}
      style={{
        background: scrolled ? 'rgba(18, 18, 22, 0.88)' : 'rgba(18, 18, 22, 0.84)',
        backdropFilter: scrolled ? 'blur(16px)' : 'blur(14px)',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'blur(14px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.28)',
      }}
    >
      <div
        className="mx-auto w-full min-w-0 max-w-[var(--shell-max-width)]"
        style={{
          paddingLeft: 'var(--topbar-pad-x)',
          paddingRight: 'var(--topbar-pad-x)',
        }}
      >
        {!isDesktopTopbar ? (
          <div className="w-full min-w-0 py-1.5">
            <div className="grid h-[var(--topbar-height)] w-full min-w-0 items-center gap-x-2 sm:gap-x-3 grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-2">
                {onOpenDrawer && (
                  <button type="button" onClick={onOpenDrawer} className={HAMBURGER_BTN} aria-label="Open menu">
                    <IconMenu className="w-5 h-5 shrink-0" />
                  </button>
                )}
                <Link
                  href="/"
                  aria-label={APP_NAME}
                  className={cn(
                    'group min-w-0 max-w-[min(64vw,240px)] rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    TOPBAR_TRANSITION
                  )}
                >
                  <BrandMarkLockupNav>
                    <BrandWordmark variant="nav" className="truncate" />
                  </BrandMarkLockupNav>
                </Link>
              </div>
              <div className={UTIL_ROW}>
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className={cn(ICON_BTN)}
                  aria-label={t('topbar.searchPlaceholder')}
                  aria-haspopup="dialog"
                  aria-expanded={mobileSearchOpen}
                >
                  <IconSearch className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
                </button>
                {utilities()}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[var(--topbar-height)] w-full min-w-0">
            {hideGlobalRightPanel ? (
              <div className="flex h-full w-full min-w-0 items-center gap-[var(--shell-gap)]">
                <div className="flex shrink-0 items-center" style={{ width: 'var(--shell-sidebar)', minWidth: 'var(--shell-sidebar)' }}>
                  <Link
                    href="/"
                    aria-label={APP_NAME}
                    className={cn(
                      'group min-w-0 rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                      TOPBAR_TRANSITION
                    )}
                  >
                    <BrandMarkLockupNav>
                      <BrandWordmark variant="nav" />
                    </BrandMarkLockupNav>
                  </Link>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-[var(--shell-gap)]">
                  <div className="flex min-w-0 flex-1 justify-center px-2">
                    <TopbarSearchForm maxClass="max-w-[min(100%,520px)]" placeholder={t('topbar.searchPlaceholder')} onSubmit={handleSearchSubmit} />
                  </div>
                  <div className={UTIL_ROW}>{utilities()}</div>
                </div>
              </div>
            ) : (
              <div
                className="grid h-full w-full min-w-0 items-center"
                style={{
                  gridTemplateColumns: 'var(--shell-sidebar) minmax(0,1fr) var(--shell-right)',
                  columnGap: 'var(--shell-gap)',
                }}
              >
                <div className="flex min-w-0 items-center">
                  <Link
                    href="/"
                    aria-label={APP_NAME}
                    className={cn(
                      'group min-w-0 rounded-lg py-0.5 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                      TOPBAR_TRANSITION
                    )}
                  >
                    <BrandMarkLockupNav>
                      <BrandWordmark variant="nav" />
                    </BrandMarkLockupNav>
                  </Link>
                </div>
                <div className="flex min-w-0 justify-center px-2">
                  <TopbarSearchForm maxClass="max-w-[min(100%,520px)]" placeholder={t('topbar.searchPlaceholder')} onSubmit={handleSearchSubmit} />
                </div>
                <div className={UTIL_ROW}>{utilities()}</div>
              </div>
            )}
          </div>
        )}
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
                  <TopbarSearchForm
                    maxClass="max-w-full"
                    placeholder={t('topbar.searchPlaceholder')}
                    onSubmit={handleMobileSearchSubmit}
                  />
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

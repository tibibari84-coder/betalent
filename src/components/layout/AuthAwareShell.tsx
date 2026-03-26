'use client';

import { usePathname } from 'next/navigation';
import { RootShell } from '@/components/layout/RootShell';
import { PublicShell } from '@/components/layout/PublicShell';

function isAuthPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  if (pathname === '/welcome') return true;
  if (pathname === '/login' || pathname === '/register') return true;
  if (pathname.startsWith('/login/')) return true;
  if (pathname === '/verify-email' || pathname.startsWith('/verify-email')) return true;
  if (pathname === '/forgot-password' || pathname.startsWith('/forgot-password')) return true;
  if (pathname === '/reset-password' || pathname.startsWith('/reset-password')) return true;
  return false;
}

function isPublicOnlyPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  if (pathname === '/' || pathname === '/landing') return true;
  if (pathname === '/terms' || pathname === '/privacy' || pathname === '/refund' || pathname === '/contact') return true;
  return false;
}

function isAppShellPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  if (pathname === '/feed' || pathname.startsWith('/feed/')) return true;
  if (pathname === '/explore' || pathname.startsWith('/explore/')) return true;
  if (pathname === '/challenges' || pathname.startsWith('/challenges/')) return true;
  if (pathname === '/upload' || pathname.startsWith('/upload/')) return true;
  if (pathname === '/inbox' || pathname.startsWith('/inbox/')) return true;
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true;
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return true;
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return true;
  if (pathname === '/wallet' || pathname.startsWith('/wallet/')) return true;
  if (pathname === '/creator' || pathname.startsWith('/creator/')) return true;
  return false;
}

/**
 * - Auth routes: standalone pages (no marketing shell, no app shell).
 * - App shell is route-scoped + member-scoped (never shown on public/auth routes).
 * - Public/auth routes always use public/auth shell variants, even for signed-in users.
 */
export function AuthAwareShell({
  children,
  isAppMember,
}: {
  children: React.ReactNode;
  /** True when signed in, email verified, and not mid–2FA (see root layout). */
  isAppMember: boolean;
}) {
  const pathname = usePathname();
  if (isAuthPath(pathname)) {
    return <>{children}</>;
  }
  if (isPublicOnlyPath(pathname)) {
    return <PublicShell>{children}</PublicShell>;
  }
  if (isAppMember && isAppShellPath(pathname)) {
    return <RootShell>{children}</RootShell>;
  }
  return <PublicShell>{children}</PublicShell>;
}

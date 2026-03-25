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

/**
 * - Auth routes: standalone pages (no marketing shell, no app shell).
 * - Email-verified signed-in members: full app shell (sidebar, rail, account controls).
 * - Guests and signed-in but unverified: public shell only (no internal app chrome).
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
  if (isAppMember) {
    return <RootShell>{children}</RootShell>;
  }
  return <PublicShell>{children}</PublicShell>;
}

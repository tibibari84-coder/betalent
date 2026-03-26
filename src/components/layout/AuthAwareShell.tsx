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
 * - Signed-in users get app shell on all non-auth routes.
 * - Signed-out users get public shell.
 */
export function AuthAwareShell({
  children,
  isAppMember,
  authUser,
}: {
  children: React.ReactNode;
  /** True when signed in and not mid–2FA (see root layout). */
  isAppMember: boolean;
  authUser: { username: string; email?: string | null } | null;
}) {
  const pathname = usePathname();
  if (isAuthPath(pathname)) {
    return <>{children}</>;
  }
  if (isAppMember) return <RootShell authUser={authUser}>{children}</RootShell>;
  return <PublicShell>{children}</PublicShell>;
}

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

function isProtectedAppPath(pathname: string | null): boolean {
  if (pathname == null) return false;
  if (pathname === '/explore' || pathname.startsWith('/explore/')) return true;
  if (pathname === '/foryou' || pathname.startsWith('/foryou/')) return true;
  if (pathname === '/feed' || pathname.startsWith('/feed/')) return true;
  if (pathname === '/challenges' || pathname.startsWith('/challenges/')) return true;
  if (pathname === '/leaderboard' || pathname.startsWith('/leaderboard/')) return true;
  if (pathname === '/upload' || pathname.startsWith('/upload/')) return true;
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return true;
  if (pathname === '/inbox' || pathname.startsWith('/inbox/')) return true;
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return true;
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return true;
  if (pathname === '/notifications' || pathname.startsWith('/notifications/')) return true;
  if (pathname === '/wallet' || pathname.startsWith('/wallet/')) return true;
  if (pathname === '/following' || pathname.startsWith('/following/')) return true;
  if (pathname === '/creator' || pathname.startsWith('/creator/')) return true;
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true;
  if (pathname === '/my-videos' || pathname.startsWith('/my-videos/')) return true;
  if (pathname === '/moderation' || pathname.startsWith('/moderation/')) return true;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return false;
}

/**
 * - Auth routes: standalone pages (no marketing shell, no app shell).
 * - Signed-in users get app shell only on protected/internal routes.
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
  if (isAppMember && isProtectedAppPath(pathname)) return <RootShell authUser={authUser}>{children}</RootShell>;
  return <PublicShell>{children}</PublicShell>;
}

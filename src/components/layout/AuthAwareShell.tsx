'use client';

import { usePathname } from 'next/navigation';
import { RootShell } from '@/components/layout/RootShell';
import { PublicShell } from '@/components/layout/PublicShell';
import { classifyRouteShell, isAuthenticatedRouteClass } from '@/components/layout/route-shells';

/**
 * Route-class driven shell assignment.
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
  const routeClass = classifyRouteShell(pathname);

  if (routeClass === 'publicAuth') {
    return <>{children}</>;
  }
  if (isAppMember && isAuthenticatedRouteClass(routeClass)) {
    return <RootShell authUser={authUser} shellVariant={routeClass === 'detailSecondary' ? 'detail' : 'primary'}>{children}</RootShell>;
  }
  return <PublicShell>{children}</PublicShell>;
}

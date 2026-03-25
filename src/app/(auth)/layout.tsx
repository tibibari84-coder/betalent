import { AuthLayout } from '@/components/layout/AuthLayout';

/**
 * Auth-only layout: no app shell (no navbar, sidebar, right panel).
 * Auth flows: login, register, verify-email, password reset, 2FA step-up.
 */
export default function AuthRouteLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}

import { prisma } from '@/lib/prisma';

export type AuthAuditAction =
  | 'REGISTER_EMAIL'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'EMAIL_VERIFIED'
  | 'VERIFICATION_RESENT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'GOOGLE_SIGNIN'
  | 'GOOGLE_LINKED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'TWO_FACTOR_CHALLENGE_FAIL';

export async function logAuthEvent(
  action: AuthAuditAction,
  options: { userId?: string | null; ip?: string | null; userAgent?: string | null; meta?: Record<string, unknown> }
): Promise<void> {
  try {
    await prisma.authAuditLog.create({
      data: {
        action,
        userId: options.userId ?? undefined,
        ip: options.ip ?? undefined,
        userAgent: options.userAgent ?? undefined,
        meta: options.meta ? (options.meta as object) : undefined,
      },
    });
  } catch (e) {
    console.warn('[auth-audit] failed to write log', action, e);
  }
}

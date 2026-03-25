import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session
 * Lightweight auth probe for smoke tests and UI (no wallet, minimal PII).
 */
export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: true, authenticated: false });
    }

    const row = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        emailVerifiedAt: true,
        role: true,
        googleId: true,
      },
    });

    if (!row) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        staleSession: true,
      });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: row.id,
        username: row.username,
        emailVerified: !!row.emailVerifiedAt,
        role: row.role,
        googleLinked: !!row.googleId,
      },
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json(
        { ok: false, authenticated: false, message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    console.error('[auth/session]', e);
    return NextResponse.json(
      { ok: false, authenticated: false, message: 'Failed to load session' },
      { status: 500 }
    );
  }
}

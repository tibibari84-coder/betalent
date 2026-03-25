import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getVerificationForUser } from '@/services/creator-verification.service';

/**
 * GET /api/creators/verification/me
 * Returns the authenticated user's verification status and level.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const verification = await getVerificationForUser(user.id);
    if (!verification) {
      return NextResponse.json({
        ok: true,
        verification: null,
        verified: false,
      });
    }
    return NextResponse.json({
      ok: true,
      verification: {
        id: verification.id,
        verificationLevel: verification.verificationLevel,
        verificationStatus: verification.verificationStatus,
        rejectionReason: verification.rejectionReason,
        requestPayload: verification.requestPayload,
        reviewedAt: verification.reviewedAt?.toISOString() ?? null,
        createdAt: verification.createdAt.toISOString(),
        updatedAt: verification.updatedAt.toISOString(),
      },
      verified: verification.verificationStatus === 'APPROVED',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized';
    return NextResponse.json({ ok: false, message: msg }, { status: 401 });
  }
}

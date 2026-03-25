/**
 * GET /api/internal/discovery-diagnostics
 * Requires env DISCOVERY_DIAGNOSTICS_SECRET and matching header X-BT-Discovery-Diagnostics.
 * Returns aggregate candidate-pool stats only (no PII, no feed output). For audits / ops.
 */
import { NextResponse } from 'next/server';
import { generateCandidates } from '@/services/for-you/candidates.service';
import { getUserAffinity } from '@/services/user-affinity.service';

export async function GET(req: Request) {
  const secret = process.env.DISCOVERY_DIAGNOSTICS_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const h = req.headers.get('x-bt-discovery-diagnostics');
  if (h !== secret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const now = new Date();
  const affinity = await getUserAffinity(null);
  const candidates = await generateCandidates({
    userId: null,
    preferredCategoryIds: affinity.preferredCategoryIds,
    preferredCreatorIds: affinity.preferredCreatorIds,
    preferredStyleSlugs: affinity.preferredStyleSlugs,
    recentlyWatchedIds: new Set(),
    now,
  });

  const bucketCounts: Record<string, number> = {};
  for (const c of candidates) {
    bucketCounts[c.bucket] = (bucketCounts[c.bucket] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    generatedAt: now.toISOString(),
    candidateTotal: candidates.length,
    bucketCounts,
    note: 'For You uses additional lightweight filter, scoring, and assembly — see feed-v2 debug=1',
  });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isMaintenanceJobName, runMaintenanceJob } from '@/lib/maintenance-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bodySchema = z.object({
  job: z.string().min(1),
});

function getBearerSecret(req: Request): string | null {
  const auth = req.headers.get('authorization')?.trim();
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

/**
 * POST /api/internal/jobs/run
 * For external schedulers (GitHub Actions, cron VM, etc.). Not for browsers.
 * Header: Authorization: Bearer INTERNAL_JOB_RUNNER_SECRET
 *    or: x-internal-job-secret: INTERNAL_JOB_RUNNER_SECRET
 * Body: { "job": "talent_ranking" | "challenge_lifecycle" | "share_velocity" }
 */
export async function POST(req: Request) {
  const configured = process.env.INTERNAL_JOB_RUNNER_SECRET?.trim();
  if (!configured || configured.length < 16) {
    return NextResponse.json({ ok: false, message: 'Job runner not configured' }, { status: 503 });
  }
  const bearer = getBearerSecret(req);
  const header = req.headers.get('x-internal-job-secret')?.trim();
  if (bearer !== configured && header !== configured) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
    }
    const job = parsed.data.job.trim();
    if (!isMaintenanceJobName(job)) {
      return NextResponse.json(
        { ok: false, message: 'Unknown job' },
        { status: 400 }
      );
    }
    const result = await runMaintenanceJob(job);
    return NextResponse.json({ ok: true, job, result });
  } catch (e) {
    console.error('[internal/jobs/run]', e);
    return NextResponse.json({ ok: false, message: 'Job failed' }, { status: 500 });
  }
}

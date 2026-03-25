import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { isMaintenanceJobName, runMaintenanceJob } from '@/lib/maintenance-jobs';

export const dynamic = 'force-dynamic';
/** Vercel Pro+ can extend; Hobby may still time out on large `talent_ranking` runs — use `scripts/run-maintenance-job.ts` for heavy jobs. */
export const maxDuration = 300;

const bodySchema = z.object({
  job: z.string().min(1),
});

/**
 * POST /api/admin/jobs/run
 * Admin session only. Triggers maintenance jobs (no Vercel cron).
 * Body: { "job": "talent_ranking" | "challenge_lifecycle" | "share_velocity" }
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
    }
    const job = parsed.data.job.trim();
    if (!isMaintenanceJobName(job)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Unknown job. Allowed: talent_ranking, challenge_lifecycle, share_velocity`,
        },
        { status: 400 }
      );
    }
    const result = await runMaintenanceJob(job);
    return NextResponse.json({ ok: true, job, result });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Forbidden') {
      return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
    }
    console.error('[admin/jobs/run]', e);
    return NextResponse.json({ ok: false, message: 'Job failed' }, { status: 500 });
  }
}

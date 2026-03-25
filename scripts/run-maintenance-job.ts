/**
 * Run a maintenance job against DATABASE_URL in the environment (e.g. Neon).
 * Does not load root .env automatically — export DATABASE_URL or use direnv / npm env.
 *
 * Usage:
 *   npx tsx scripts/run-maintenance-job.ts talent_ranking
 *   npx tsx scripts/run-maintenance-job.ts challenge_lifecycle
 *   npx tsx scripts/run-maintenance-job.ts share_velocity
 */
import { isMaintenanceJobName, runMaintenanceJob } from '@/lib/maintenance-jobs';

async function main() {
  const job = process.argv[2]?.trim();
  if (!job || !isMaintenanceJobName(job)) {
    console.error(
      'Usage: npx tsx scripts/run-maintenance-job.ts <talent_ranking|challenge_lifecycle|share_velocity>'
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is required in the environment.');
    process.exit(1);
  }
  const result = await runMaintenanceJob(job);
  console.log(JSON.stringify({ ok: true, job, result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

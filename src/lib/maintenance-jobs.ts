import { runChallengeLifecycleJob } from '@/services/challenge-lifecycle.service';
import { runLiveSessionAutoAdvanceJob } from '@/services/live-challenge-orchestration.service';
import { runShareVelocityJob } from '@/services/share-velocity-job.service';
import { runTalentRankingJob } from '@/services/talent-ranking.service';

export const MAINTENANCE_JOB_NAMES = [
  'talent_ranking',
  'challenge_lifecycle',
  'share_velocity',
  'live_session_auto_advance',
] as const;

export type MaintenanceJobName = (typeof MAINTENANCE_JOB_NAMES)[number];

export function isMaintenanceJobName(s: string): s is MaintenanceJobName {
  return (MAINTENANCE_JOB_NAMES as readonly string[]).includes(s);
}

export async function runMaintenanceJob(name: MaintenanceJobName): Promise<unknown> {
  switch (name) {
    case 'talent_ranking':
      return runTalentRankingJob();
    case 'challenge_lifecycle':
      return runChallengeLifecycleJob();
    case 'share_velocity':
      return runShareVelocityJob();
    case 'live_session_auto_advance':
      return runLiveSessionAutoAdvanceJob();
    default: {
      const _x: never = name;
      return _x;
    }
  }
}

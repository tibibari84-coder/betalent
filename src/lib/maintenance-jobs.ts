import { runChallengeLifecycleJob } from '@/services/challenge-lifecycle.service';
import { runLiveSessionAutoAdvanceJob } from '@/services/live-challenge-orchestration.service';
import { runVideoCleanupWorker } from '@/server/workers/videoCleanupWorker';
import { runVideoProcessingWorker } from '@/server/workers/videoProcessingWorker';
import { runStaleUploadCleanupWorker } from '@/server/workers/staleUploadCleanupWorker';
import { runShareVelocityJob } from '@/services/share-velocity-job.service';
import { runTalentRankingJob } from '@/services/talent-ranking.service';

export const MAINTENANCE_JOB_NAMES = [
  'talent_ranking',
  'challenge_lifecycle',
  'share_velocity',
  'live_session_auto_advance',
  'video_cleanup',
  'video_processing',
  'stale_upload_cleanup',
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
    case 'video_cleanup':
      return runVideoCleanupWorker();
    case 'video_processing':
      return runVideoProcessingWorker();
    case 'stale_upload_cleanup':
      return runStaleUploadCleanupWorker();
    default: {
      const _x: never = name;
      return _x;
    }
  }
}

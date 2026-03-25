import type { RecordingMode } from '@/constants/recording-modes';

export type StudioModeCopy = {
  /** Short badge (e.g. “Live Challenge”) */
  liveChallengeBadge: string;
  studioLabel: string;
  prepLabel: string;
  prepTitle: string;
  prepDescription: string;
  /** Extra rules / expectations for live challenge recording */
  liveRulesHelper: string;
  boothLabel: string;
  boothDescription: string;
  reviewLabel: string;
  reviewTitle: string;
  reviewDescription: string;
};

export function getStudioModeCopy(mode: RecordingMode): StudioModeCopy {
  if (mode === 'live') {
    return {
      liveChallengeBadge: 'Live Challenge',
      studioLabel: 'BETALENT Live Studio',
      prepLabel: 'Live challenge prep',
      prepTitle: 'Prepare your live challenge take',
      prepDescription:
        'Set your performance details, then step into the live challenge room. Your live take hard-stops at',
      liveRulesHelper:
        'One authentic take — real vocals (no playback or lip-sync). Stay in frame, watch the timer, and finish before the hard stop. This recording uses the same engine as standard Studio; only the time limit and labels change. Your submission may be reviewed for authenticity.',
      boothLabel: 'Live challenge room',
      boothDescription: 'Challenge mode is active. Stay in frame and deliver your full take before time runs out.',
      reviewLabel: 'Live challenge review',
      reviewTitle: 'Submit this live challenge take?',
      reviewDescription: 'Review once, then use this take to continue challenge submission.',
    };
  }

  return {
    liveChallengeBadge: '',
    studioLabel: 'BETALENT Studio',
    prepLabel: 'Session prep',
    prepTitle: 'Set the stage',
    prepDescription:
      'Lock in title, style, and rules—then step into a vertical-first live room. Your take hard-stops at',
    liveRulesHelper: '',
    boothLabel: 'Live room',
    boothDescription: 'Frame your shot, keep your mic live, and record your best take.',
    reviewLabel: 'Playback review',
    reviewTitle: 'Ship this performance?',
    reviewDescription: 'Listen back once—if it’s clean, send it down the same publish pipeline as a device upload.',
  };
}

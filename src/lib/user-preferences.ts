import { z } from 'zod';

export const patchUserPreferencesSchema = z.object({
  profileVisibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']).optional(),
  defaultCommentPermission: z.enum(['EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF']).optional(),
  allowVotesOnPerformances: z.boolean().optional(),
  notifyChallenges: z.boolean().optional(),
  notifyVotes: z.boolean().optional(),
  notifyGifts: z.boolean().optional(),
  notifyFollowers: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyAnnouncements: z.boolean().optional(),
});

export type PatchUserPreferences = z.infer<typeof patchUserPreferencesSchema>;

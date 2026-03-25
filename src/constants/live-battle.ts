/**
 * BETALENT live battle – duration, vote types, rewards.
 * See: docs/LIVE-BATTLE-SCORING-AND-DATA.md
 */

import type { BattleVoteType } from '@prisma/client';

/** Battle duration in seconds (3 minutes). */
export const LIVE_BATTLE_DURATION_SEC = 180;

/** Default bonus coins credited to winner when battle ends. */
export const LIVE_BATTLE_DEFAULT_BONUS_COINS = 500;

/** Vote types that contribute to battle_score. */
export const BATTLE_VOTE_TYPES: BattleVoteType[] = ['GIFT', 'COIN_VOTE', 'SUPER_VOTE'];

/** Super vote point value (if fixed per super vote). */
export const BATTLE_SUPER_VOTE_POINTS = 10;

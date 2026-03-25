-- Weekly Global Live Challenge — part 2b: status backfill + Challenge columns (separate tx from ChallengeWindow create).

UPDATE "Challenge" SET status = 'ENTRY_OPEN'::"ChallengeStatus" WHERE status = 'OPEN';
UPDATE "Challenge" SET status = 'VOTING_CLOSED'::"ChallengeStatus" WHERE status = 'VOTING';
UPDATE "Challenge" SET status = 'WINNERS_LOCKED'::"ChallengeStatus" WHERE status = 'ENDED';

ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "entryOpenAt" TIMESTAMP(3);
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "entryCloseAt" TIMESTAMP(3);
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "votingCloseAt" TIMESTAMP(3);
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "isGlobalWeekly" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Challenge" SET "entryOpenAt" = "startAt" WHERE "entryOpenAt" IS NULL;
UPDATE "Challenge" SET "entryCloseAt" = "endAt" WHERE "entryCloseAt" IS NULL;
UPDATE "Challenge" SET "votingCloseAt" = "endAt" WHERE "votingCloseAt" IS NULL;

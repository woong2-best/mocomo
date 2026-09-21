-- Reward tier label (Novice/Pulse/…) separate from SupportTierLevel ore badges
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "achievedRewardTier" TEXT;

ALTER TABLE "CreatorRewardPayoutBatch" ALTER COLUMN "rewardUsd" SET DATA TYPE DOUBLE PRECISION USING "rewardUsd"::double precision;

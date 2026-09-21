-- Express 표준화: 세무 게이트 · Custom 마이그레이션 · Reward 배치 재시도 필드

ALTER TABLE "CreatorSettlementProfile" ADD COLUMN IF NOT EXISTS "connectAccountType" TEXT;
ALTER TABLE "CreatorSettlementProfile" ADD COLUMN IF NOT EXISTS "taxReportingReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorSettlementProfile" ADD COLUMN IF NOT EXISTS "taxRequirementsDue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorSettlementProfile" ADD COLUMN IF NOT EXISTS "lastTaxGateCheckedAt" TIMESTAMP(3);
ALTER TABLE "CreatorSettlementProfile" ADD COLUMN IF NOT EXISTS "needsExpressMigration" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "CreatorSettlementProfile_taxReportingReady_payoutsEnabled_idx"
  ON "CreatorSettlementProfile"("taxReportingReady", "payoutsEnabled");

ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "stripePayoutId" TEXT;
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "skipReason" TEXT;
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreatorRewardPayoutBatch" ADD COLUMN IF NOT EXISTS "lastRetryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CreatorRewardPayoutBatch_stripeTransferId_idx"
  ON "CreatorRewardPayoutBatch"("stripeTransferId");

-- Platform expansion: Promotion stack + Ledger + Wallet + FeatureFlag + Scheduler + NotificationDelivery
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "stackable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "allowDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "maxStackPerSettlement" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "SettlementLedgerEntry" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT,
  "userId" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amountKrw" INTEGER NOT NULL,
  "balanceAfterKrw" INTEGER,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SettlementLedgerEntry_settlementId_createdAt_idx" ON "SettlementLedgerEntry"("settlementId", "createdAt");
CREATE INDEX IF NOT EXISTS "SettlementLedgerEntry_userId_createdAt_idx" ON "SettlementLedgerEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SettlementLedgerEntry_entryType_createdAt_idx" ON "SettlementLedgerEntry"("entryType", "createdAt");

CREATE TABLE IF NOT EXISTS "PlatformWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mocoPoints" INTEGER NOT NULL DEFAULT 0,
  "siteCreditKrw" INTEGER NOT NULL DEFAULT 0,
  "promoCreditKrw" INTEGER NOT NULL DEFAULT 0,
  "refundCreditKrw" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformWallet_userId_key" ON "PlatformWallet"("userId");

CREATE TABLE IF NOT EXISTS "PlatformWalletLedger" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformWalletLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlatformWalletLedger_walletId_createdAt_idx" ON "PlatformWalletLedger"("walletId", "createdAt");
CREATE INDEX IF NOT EXISTS "PlatformWalletLedger_bucket_createdAt_idx" ON "PlatformWalletLedger"("bucket", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PlatformWallet" ADD CONSTRAINT "PlatformWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PlatformWalletLedger" ADD CONSTRAINT "PlatformWalletLedger_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PlatformWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "metadata" JSONB,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX IF NOT EXISTS "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

CREATE TABLE IF NOT EXISTS "ScheduledJob" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "cronExpr" TEXT,
  "payload" JSONB,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "lastError" TEXT,
  "nextRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduledJob_name_key" ON "ScheduledJob"("name");
CREATE INDEX IF NOT EXISTS "ScheduledJob_enabled_nextRunAt_idx" ON "ScheduledJob"("enabled", "nextRunAt");
CREATE INDEX IF NOT EXISTS "ScheduledJob_jobType_idx" ON "ScheduledJob"("jobType");

CREATE TABLE IF NOT EXISTS "ScheduledJobRun" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "detail" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "ScheduledJobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ScheduledJobRun_jobId_startedAt_idx" ON "ScheduledJobRun"("jobId", "startedAt");
DO $$ BEGIN
  ALTER TABLE "ScheduledJobRun" ADD CONSTRAINT "ScheduledJobRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ScheduledJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT,
  "userId" TEXT,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NotificationDelivery_channel_status_createdAt_idx" ON "NotificationDelivery"("channel", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

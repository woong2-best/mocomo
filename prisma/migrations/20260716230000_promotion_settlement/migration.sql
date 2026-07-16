-- Promotion + Settlement expansion
DO $$ BEGIN CREATE TYPE "PromotionTrigger" AS ENUM ('MANUAL','ON_SIGNUP','ON_FIRST_LIVE','ON_FIRST_SALE','ON_EVENT','SCHEDULED_DATE','CRON_RULE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PromotionAssignmentStatus" AS ENUM ('ACTIVE','EXHAUSTED','EXPIRED','REVOKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SettlementStatus" AS ENUM ('PENDING','REVIEW','APPROVED','REJECTED','PROCESSING','PAID','FAILED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SettlementItemType" AS ENUM ('TIP','EMOTICON','DIGITAL_PRODUCT','GOODS','AD','LIVE','PLATFORM_FEE','PROMOTION_DISCOUNT','COUPON_DISCOUNT','PAYOUT','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Promotion" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "benefitType" "CouponBenefitType" NOT NULL,
  "waiveUpToKrw" INTEGER,
  "percentOff" INTEGER,
  "fixedDiscountKrw" INTEGER,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "trigger" "PromotionTrigger" NOT NULL DEFAULT 'MANUAL',
  "rules" JSONB,
  "scheduledAt" TIMESTAMP(3),
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "maxUsesPerUser" INTEGER,
  "maxTotalUses" INTEGER,
  "adminMemo" TEXT,
  "createdById" TEXT NOT NULL,
  "assignedCount" INTEGER NOT NULL DEFAULT 0,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "usedBenefitKrw" INTEGER NOT NULL DEFAULT 0,
  "expiryNotified7d" BOOLEAN NOT NULL DEFAULT false,
  "expiryNotified3d" BOOLEAN NOT NULL DEFAULT false,
  "expiryNotified1d" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_slug_key" ON "Promotion"("slug");
CREATE INDEX IF NOT EXISTS "Promotion_active_priority_idx" ON "Promotion"("active", "priority");
CREATE INDEX IF NOT EXISTS "Promotion_trigger_active_idx" ON "Promotion"("trigger", "active");
CREATE INDEX IF NOT EXISTS "Promotion_endsAt_idx" ON "Promotion"("endsAt");
CREATE INDEX IF NOT EXISTS "Promotion_createdAt_idx" ON "Promotion"("createdAt");

CREATE TABLE IF NOT EXISTS "PromotionAssignment" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedById" TEXT,
  "status" "PromotionAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "remainingBenefitKrw" INTEGER,
  "usedBenefitKrw" INTEGER NOT NULL DEFAULT 0,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromotionAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PromotionAssignment_promotionId_userId_key" ON "PromotionAssignment"("promotionId", "userId");
CREATE INDEX IF NOT EXISTS "PromotionAssignment_userId_status_idx" ON "PromotionAssignment"("userId", "status");
CREATE INDEX IF NOT EXISTS "PromotionAssignment_promotionId_status_idx" ON "PromotionAssignment"("promotionId", "status");

CREATE TABLE IF NOT EXISTS "PromotionUsage" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "grossAmountKrw" INTEGER NOT NULL,
  "benefitAppliedKrw" INTEGER NOT NULL,
  "feeBeforeKrw" INTEGER NOT NULL,
  "feeAfterKrw" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PromotionUsage_promotionId_createdAt_idx" ON "PromotionUsage"("promotionId", "createdAt");
CREATE INDEX IF NOT EXISTS "PromotionUsage_userId_createdAt_idx" ON "PromotionUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PromotionUsage_referenceType_referenceId_idx" ON "PromotionUsage"("referenceType", "referenceId");

CREATE TABLE IF NOT EXISTS "PromotionHistory" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PromotionHistory_promotionId_createdAt_idx" ON "PromotionHistory"("promotionId", "createdAt");

CREATE TABLE IF NOT EXISTS "Settlement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "grossAmountKrw" INTEGER NOT NULL DEFAULT 0,
  "feeAmountKrw" INTEGER NOT NULL DEFAULT 0,
  "discountAmountKrw" INTEGER NOT NULL DEFAULT 0,
  "netAmountKrw" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'krw',
  "title" TEXT,
  "note" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "payoutRequestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Settlement_userId_status_idx" ON "Settlement"("userId", "status");
CREATE INDEX IF NOT EXISTS "Settlement_status_createdAt_idx" ON "Settlement"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Settlement_createdAt_idx" ON "Settlement"("createdAt");

CREATE TABLE IF NOT EXISTS "SettlementItem" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "type" "SettlementItemType" NOT NULL,
  "label" TEXT NOT NULL,
  "amountKrw" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SettlementItem_settlementId_idx" ON "SettlementItem"("settlementId");
CREATE INDEX IF NOT EXISTS "SettlementItem_type_idx" ON "SettlementItem"("type");

CREATE TABLE IF NOT EXISTS "SettlementHistory" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "fromStatus" "SettlementStatus",
  "toStatus" "SettlementStatus",
  "detail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SettlementHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SettlementHistory_settlementId_createdAt_idx" ON "SettlementHistory"("settlementId", "createdAt");

DO $$ BEGIN ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionAssignment" ADD CONSTRAINT "PromotionAssignment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionAssignment" ADD CONSTRAINT "PromotionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionAssignment" ADD CONSTRAINT "PromotionAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PromotionAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionUsage" ADD CONSTRAINT "PromotionUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PromotionHistory" ADD CONSTRAINT "PromotionHistory_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SettlementHistory" ADD CONSTRAINT "SettlementHistory_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

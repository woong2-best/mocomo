-- Coupon / promotion system
DO $$ BEGIN
  CREATE TYPE "CouponBenefitType" AS ENUM ('FEE_WAIVER', 'FEE_PERCENT_OFF', 'FIXED_AMOUNT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponAudience" AS ENUM ('ALL_USERS', 'SPECIFIC_USERS', 'SPECIFIC_CREATORS', 'SPECIFIC_TIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CouponAssignmentStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Coupon" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "benefitType" "CouponBenefitType" NOT NULL,
  "waiveUpToKrw" INTEGER,
  "percentOff" INTEGER,
  "fixedDiscountKrw" INTEGER,
  "audience" "CouponAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
  "targetTier" TEXT,
  "maxUsesPerUser" INTEGER,
  "maxTotalUses" INTEGER,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "adminMemo" TEXT,
  "createdById" TEXT NOT NULL,
  "assignedCount" INTEGER NOT NULL DEFAULT 0,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "usedBenefitKrw" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_active_endsAt_idx" ON "Coupon"("active", "endsAt");
CREATE INDEX IF NOT EXISTS "Coupon_createdAt_idx" ON "Coupon"("createdAt");
CREATE INDEX IF NOT EXISTS "Coupon_createdById_idx" ON "Coupon"("createdById");
CREATE INDEX IF NOT EXISTS "Coupon_name_idx" ON "Coupon"("name");

CREATE TABLE IF NOT EXISTS "CouponAssignment" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedById" TEXT,
  "status" "CouponAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "remainingBenefitKrw" INTEGER,
  "usedBenefitKrw" INTEGER NOT NULL DEFAULT 0,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CouponAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponAssignment_couponId_userId_key" ON "CouponAssignment"("couponId", "userId");
CREATE INDEX IF NOT EXISTS "CouponAssignment_userId_status_idx" ON "CouponAssignment"("userId", "status");
CREATE INDEX IF NOT EXISTS "CouponAssignment_couponId_status_idx" ON "CouponAssignment"("couponId", "status");

CREATE TABLE IF NOT EXISTS "CouponUsage" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
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
  CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_createdAt_idx" ON "CouponUsage"("couponId", "createdAt");
CREATE INDEX IF NOT EXISTS "CouponUsage_userId_createdAt_idx" ON "CouponUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "CouponUsage_assignmentId_createdAt_idx" ON "CouponUsage"("assignmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "CouponUsage_referenceType_referenceId_idx" ON "CouponUsage"("referenceType", "referenceId");

CREATE TABLE IF NOT EXISTS "CouponHistory" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CouponHistory_couponId_createdAt_idx" ON "CouponHistory"("couponId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "CouponAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CouponHistory" ADD CONSTRAINT "CouponHistory_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

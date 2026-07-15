-- Marketplace protection: escrow, trust, risk, reports, sanctions, audit

-- ReportTargetType
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_LISTING';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_SELLER';

-- Order status / settlement / trust / sanction / dispute / report enums
DO $$ BEGIN
  CREATE TYPE "MarketplaceSettlementStatus" AS ENUM ('PENDING','HELD','READY','SETTLED','BLOCKED','REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketplaceTrustTier" AS ENUM ('NEW','STANDARD','TRUSTED','PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketplaceSanctionLevel" AS ENUM ('NONE','WARNING','LISTING_RESTRICTED','SALES_SUSPENDED','SETTLEMENT_HELD','PERMANENT_BAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketplaceDisputeReason" AS ENUM ('NOT_RECEIVED','COUNTERFEIT','NOT_AS_DESCRIBED','DAMAGED','MISSING_PARTS','SELLER_NO_RESPONSE','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MarketplaceReportReason" AS ENUM ('FRAUD','COUNTERFEIT','COPYRIGHT','ILLEGAL','SPAM','ADULT','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "MarketplaceOrderStatus" ADD VALUE IF NOT EXISTS 'SETTLED';
ALTER TYPE "MarketplaceOrderStatus" ADD VALUE IF NOT EXISTS 'ADMIN_REVIEW';

-- Seller profile trust fields
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "trustTier" "MarketplaceTrustTier" NOT NULL DEFAULT 'NEW';
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "sanctionLevel" "MarketplaceSanctionLevel" NOT NULL DEFAULT 'NONE';
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "reportCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "confirmedOrderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "refundedOrderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "disputedOrderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "lateShipCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "canList" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MarketplaceSellerProfile" ADD COLUMN IF NOT EXISTS "settlementBlocked" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "MarketplaceSellerProfile_trustTier_trustScore_idx" ON "MarketplaceSellerProfile"("trustTier", "trustScore");
CREATE INDEX IF NOT EXISTS "MarketplaceSellerProfile_sanctionLevel_idx" ON "MarketplaceSellerProfile"("sanctionLevel");

-- Order escrow / risk
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "settlementStatus" "MarketplaceSettlementStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "stripeTransferId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "escrowHeld" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "settlementHeldReason" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MarketplaceOrder" ADD COLUMN IF NOT EXISTS "adminReviewRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "MarketplaceOrder_settlementStatus_confirmedAt_idx" ON "MarketplaceOrder"("settlementStatus", "confirmedAt");
CREATE INDEX IF NOT EXISTS "MarketplaceOrder_adminReviewRequired_createdAt_idx" ON "MarketplaceOrder"("adminReviewRequired", "createdAt");

-- Shipment proof
ALTER TABLE "MarketplaceShipment" ADD COLUMN IF NOT EXISTS "proofUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MarketplaceShipment" ADD COLUMN IF NOT EXISTS "packingNote" TEXT;

-- Dispute evidence
ALTER TABLE "MarketplaceDispute" ADD COLUMN IF NOT EXISTS "reasonCode" "MarketplaceDisputeReason" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "MarketplaceDispute" ADD COLUMN IF NOT EXISTS "buyerEvidence" JSONB;
ALTER TABLE "MarketplaceDispute" ADD COLUMN IF NOT EXISTS "sellerEvidence" JSONB;

-- Audit / sanction / report tables
CREATE TABLE IF NOT EXISTS "MarketplaceAuditLog" (
  "id" TEXT NOT NULL,
  "orderId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceAuditLog_orderId_createdAt_idx" ON "MarketplaceAuditLog"("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceAuditLog_action_createdAt_idx" ON "MarketplaceAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceAuditLog_actorId_createdAt_idx" ON "MarketplaceAuditLog"("actorId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MarketplaceAuditLog" ADD CONSTRAINT "MarketplaceAuditLog_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MarketplaceSanction" (
  "id" TEXT NOT NULL,
  "sellerProfileId" TEXT NOT NULL,
  "level" "MarketplaceSanctionLevel" NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceSanction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceSanction_sellerProfileId_createdAt_idx" ON "MarketplaceSanction"("sellerProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceSanction_active_level_idx" ON "MarketplaceSanction"("active", "level");
DO $$ BEGIN
  ALTER TABLE "MarketplaceSanction" ADD CONSTRAINT "MarketplaceSanction_sellerProfileId_fkey"
    FOREIGN KEY ("sellerProfileId") REFERENCES "MarketplaceSellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "MarketplaceReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" "MarketplaceReportReason" NOT NULL,
  "details" TEXT,
  "listingId" TEXT,
  "sellerProfileId" TEXT,
  "sellerUserId" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketplaceReport_sellerProfileId_status_idx" ON "MarketplaceReport"("sellerProfileId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceReport_listingId_status_idx" ON "MarketplaceReport"("listingId", "status");
CREATE INDEX IF NOT EXISTS "MarketplaceReport_status_createdAt_idx" ON "MarketplaceReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketplaceReport_reporterId_createdAt_idx" ON "MarketplaceReport"("reporterId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "MarketplaceReport" ADD CONSTRAINT "MarketplaceReport_sellerProfileId_fkey"
    FOREIGN KEY ("sellerProfileId") REFERENCES "MarketplaceSellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

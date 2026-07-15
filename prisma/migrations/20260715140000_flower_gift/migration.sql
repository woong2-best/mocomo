-- Flower Gift digital asset system

ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'FLOWER';

DO $$ BEGIN
  CREATE TYPE "FlowerAssetStatus" AS ENUM ('HELD','LOCKED','REDEEMED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "FlowerLedgerAction" AS ENUM ('PURCHASE','MINT','GIFT_OUT','GIFT_IN','REDEEM_LOCK','REDEEM_PAID','REDEEM_REJECTED','REFUND','ADMIN_REVOKE','ADMIN_RESTORE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "FlowerRedeemStatus" AS ENUM ('PENDING','APPROVED','PAID','REJECTED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "FlowerGiftContext" AS ENUM ('LIVE','POST','COMMENT','MESSAGE','PROFILE','DIRECT','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "FlowerType" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameKo" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "priceKrw" INTEGER NOT NULL,
  "defaultMessage" TEXT NOT NULL,
  "imageUrl" TEXT,
  "animationKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerType_slug_key" ON "FlowerType"("slug");
CREATE INDEX IF NOT EXISTS "FlowerType_active_sortOrder_idx" ON "FlowerType"("active", "sortOrder");

CREATE TABLE IF NOT EXISTS "FlowerPurchase" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "flowerTypeId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceKrw" INTEGER NOT NULL,
  "totalAmountKrw" INTEGER NOT NULL,
  "paymentIntentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerPurchase_paymentIntentId_key" ON "FlowerPurchase"("paymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerPurchase_idempotencyKey_key" ON "FlowerPurchase"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FlowerPurchase_buyerId_createdAt_idx" ON "FlowerPurchase"("buyerId", "createdAt");

CREATE TABLE IF NOT EXISTS "FlowerAsset" (
  "id" TEXT NOT NULL,
  "flowerTypeId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "faceValueKrw" INTEGER NOT NULL,
  "status" "FlowerAssetStatus" NOT NULL DEFAULT 'HELD',
  "purchaseId" TEXT,
  "chainRootId" TEXT,
  "lastTransferId" TEXT,
  "lockedAt" TIMESTAMP(3),
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FlowerAsset_ownerId_status_idx" ON "FlowerAsset"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "FlowerAsset_flowerTypeId_status_idx" ON "FlowerAsset"("flowerTypeId", "status");
CREATE INDEX IF NOT EXISTS "FlowerAsset_chainRootId_idx" ON "FlowerAsset"("chainRootId");
CREATE INDEX IF NOT EXISTS "FlowerAsset_status_createdAt_idx" ON "FlowerAsset"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "FlowerTransfer" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "message" TEXT,
  "usedDefaultMessage" BOOLEAN NOT NULL DEFAULT false,
  "context" "FlowerGiftContext" NOT NULL DEFAULT 'DIRECT',
  "contextId" TEXT,
  "previousTransferId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerTransfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerTransfer_idempotencyKey_key" ON "FlowerTransfer"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FlowerTransfer_assetId_createdAt_idx" ON "FlowerTransfer"("assetId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerTransfer_fromUserId_createdAt_idx" ON "FlowerTransfer"("fromUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerTransfer_toUserId_createdAt_idx" ON "FlowerTransfer"("toUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerTransfer_context_contextId_idx" ON "FlowerTransfer"("context", "contextId");

CREATE TABLE IF NOT EXISTS "FlowerLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assetId" TEXT,
  "action" "FlowerLedgerAction" NOT NULL,
  "amountKrw" INTEGER NOT NULL,
  "balanceAfterKrw" INTEGER,
  "idempotencyKey" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerLedgerEntry_idempotencyKey_key" ON "FlowerLedgerEntry"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FlowerLedgerEntry_userId_createdAt_idx" ON "FlowerLedgerEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerLedgerEntry_assetId_createdAt_idx" ON "FlowerLedgerEntry"("assetId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerLedgerEntry_action_createdAt_idx" ON "FlowerLedgerEntry"("action", "createdAt");

CREATE TABLE IF NOT EXISTS "FlowerRedeemRequest" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "faceValueKrw" INTEGER NOT NULL,
  "feeBps" INTEGER NOT NULL DEFAULT 1500,
  "feeAmountKrw" INTEGER NOT NULL,
  "netAmountKrw" INTEGER NOT NULL,
  "status" "FlowerRedeemStatus" NOT NULL DEFAULT 'PENDING',
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "stripeTransferId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "adminNote" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerRedeemRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FlowerRedeemRequest_idempotencyKey_key" ON "FlowerRedeemRequest"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "FlowerRedeemRequest_userId_status_createdAt_idx" ON "FlowerRedeemRequest"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerRedeemRequest_status_createdAt_idx" ON "FlowerRedeemRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerRedeemRequest_assetId_idx" ON "FlowerRedeemRequest"("assetId");

CREATE TABLE IF NOT EXISTS "FlowerAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "detail" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlowerAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FlowerAuditLog_action_createdAt_idx" ON "FlowerAuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerAuditLog_targetId_createdAt_idx" ON "FlowerAuditLog"("targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "FlowerAuditLog_actorId_createdAt_idx" ON "FlowerAuditLog"("actorId", "createdAt");

DO $$ BEGIN ALTER TABLE "FlowerPurchase" ADD CONSTRAINT "FlowerPurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerPurchase" ADD CONSTRAINT "FlowerPurchase_flowerTypeId_fkey" FOREIGN KEY ("flowerTypeId") REFERENCES "FlowerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerAsset" ADD CONSTRAINT "FlowerAsset_flowerTypeId_fkey" FOREIGN KEY ("flowerTypeId") REFERENCES "FlowerType"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerAsset" ADD CONSTRAINT "FlowerAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerAsset" ADD CONSTRAINT "FlowerAsset_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FlowerPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerTransfer" ADD CONSTRAINT "FlowerTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FlowerAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerTransfer" ADD CONSTRAINT "FlowerTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerTransfer" ADD CONSTRAINT "FlowerTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerLedgerEntry" ADD CONSTRAINT "FlowerLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerLedgerEntry" ADD CONSTRAINT "FlowerLedgerEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FlowerAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerRedeemRequest" ADD CONSTRAINT "FlowerRedeemRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FlowerAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FlowerRedeemRequest" ADD CONSTRAINT "FlowerRedeemRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed catalog
INSERT INTO "FlowerType" ("id","slug","nameKo","nameEn","emoji","priceKrw","defaultMessage","animationKey","sortOrder","active","createdAt","updatedAt")
VALUES
  ('flower_rose','rose','로즈','Rose','🌹',5000,'항상 응원합니다.','bloom-soft',10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('flower_cherry','cherry-blossom','벚꽃','Cherry Blossom','🌸',10000,'당신의 작품이 많은 사람들에게 봄처럼 다가가길 바랍니다.','petals',20,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('flower_sunflower','sunflower','해바라기','Sunflower','🌻',30000,'당신은 많은 사람들에게 빛이 되는 창작자입니다.','sun-glow',30,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('flower_camellia','camellia','동백','Camellia','🌺',50000,'당신의 열정과 노력을 진심으로 응원합니다.','deep-bloom',40,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('flower_lily','lily','백합','Lily','🌼',100000,'최고의 존경과 감사의 마음을 담아 보냅니다.','prestige',50,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

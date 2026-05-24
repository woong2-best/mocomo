-- ============================================================
-- MoCoMo Supabase 전체 DB 수정 (SQL Editor에 이 파일만 붙여넣고 Run)
-- fix-support-tier-enum.sql / supabase-sync.sql 따로 실행하지 마세요
-- ============================================================

-- A) User 누락 컬럼
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalSupportSent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totalSupportReceived" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "platformDevSupporter" BOOLEAN NOT NULL DEFAULT false;

-- B) tier 컬럼 없으면 TEXT로 추가
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supportTierSent" TEXT DEFAULT 'PEBBLE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supportTierReceived" TEXT DEFAULT 'PEBBLE';

-- C) enum 컬럼 → TEXT (COSMIC 쓰기 전에 반드시 TEXT로)
ALTER TABLE "User" ALTER COLUMN "supportTierSent" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "supportTierSent" TYPE TEXT USING "supportTierSent"::text;

ALTER TABLE "User" ALTER COLUMN "supportTierReceived" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "supportTierReceived" TYPE TEXT USING "supportTierReceived"::text;

DO $$ BEGIN
  ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" DROP DEFAULT;
  ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" TYPE TEXT USING "tier"::text;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" DROP DEFAULT;
  ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" TYPE TEXT USING "minChatTier"::text;
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- D) 예전 enum 값 → 새 이름 (TEXT 상태에서 수정 — COSMIC 아직 없어도 OK)
UPDATE "User" SET "supportTierSent" = 'COSMIC' WHERE "supportTierSent" IN ('CROWN', 'GALAXY');
UPDATE "User" SET "supportTierReceived" = 'COSMIC' WHERE "supportTierReceived" IN ('CROWN', 'GALAXY');

DO $$ BEGIN
  UPDATE "CreatorSupport" SET "tier" = 'COSMIC' WHERE "tier" IN ('CROWN', 'GALAXY');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "CosplayerProfile" SET "minChatTier" = 'STONE' WHERE "minChatTier" IN ('CROWN', 'GALAXY');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

UPDATE "User" SET "supportTierSent" = 'PEBBLE' WHERE "supportTierSent" IS NULL OR "supportTierSent" = '';
UPDATE "User" SET "supportTierReceived" = 'PEBBLE' WHERE "supportTierReceived" IS NULL OR "supportTierReceived" = '';

-- E) 예전 enum 타입 삭제 후 새 enum 생성
DROP TYPE IF EXISTS "SupportTierLevel" CASCADE;

CREATE TYPE "SupportTierLevel" AS ENUM (
  'PEBBLE', 'STONE', 'COAL', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'SAPPHIRE', 'RUBY', 'DIAMOND', 'CRYSTAL', 'MYTHRIL', 'ORICHALCUM',
  'CELESTITE', 'ASTRAL', 'COSMIC', 'ETERNAL'
);

-- F) TEXT → 새 enum
ALTER TABLE "User"
  ALTER COLUMN "supportTierSent" TYPE "SupportTierLevel"
  USING (CASE
    WHEN "supportTierSent" IN (
      'PEBBLE','STONE','COAL','IRON','BRONZE','SILVER','GOLD','PLATINUM',
      'EMERALD','SAPPHIRE','RUBY','DIAMOND','CRYSTAL','MYTHRIL','ORICHALCUM',
      'CELESTITE','ASTRAL','COSMIC','ETERNAL'
    ) THEN "supportTierSent"::"SupportTierLevel"
    ELSE 'PEBBLE'::"SupportTierLevel"
  END);

ALTER TABLE "User"
  ALTER COLUMN "supportTierReceived" TYPE "SupportTierLevel"
  USING (CASE
    WHEN "supportTierReceived" IN (
      'PEBBLE','STONE','COAL','IRON','BRONZE','SILVER','GOLD','PLATINUM',
      'EMERALD','SAPPHIRE','RUBY','DIAMOND','CRYSTAL','MYTHRIL','ORICHALCUM',
      'CELESTITE','ASTRAL','COSMIC','ETERNAL'
    ) THEN "supportTierReceived"::"SupportTierLevel"
    ELSE 'PEBBLE'::"SupportTierLevel"
  END);

ALTER TABLE "User" ALTER COLUMN "supportTierSent" SET DEFAULT 'PEBBLE'::"SupportTierLevel";
ALTER TABLE "User" ALTER COLUMN "supportTierReceived" SET DEFAULT 'PEBBLE'::"SupportTierLevel";

DO $$ BEGIN
  ALTER TABLE "CreatorSupport"
    ALTER COLUMN "tier" TYPE "SupportTierLevel"
    USING (CASE
      WHEN "tier" IN (
        'PEBBLE','STONE','COAL','IRON','BRONZE','SILVER','GOLD','PLATINUM',
        'EMERALD','SAPPHIRE','RUBY','DIAMOND','CRYSTAL','MYTHRIL','ORICHALCUM',
        'CELESTITE','ASTRAL','COSMIC','ETERNAL'
      ) THEN "tier"::"SupportTierLevel"
      ELSE 'PEBBLE'::"SupportTierLevel"
    END);
  ALTER TABLE "CreatorSupport" ALTER COLUMN "tier" SET DEFAULT 'PEBBLE'::"SupportTierLevel";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CosplayerProfile"
    ALTER COLUMN "minChatTier" TYPE "SupportTierLevel"
    USING (CASE
      WHEN "minChatTier" IN (
        'PEBBLE','STONE','COAL','IRON','BRONZE','SILVER','GOLD','PLATINUM',
        'EMERALD','SAPPHIRE','RUBY','DIAMOND','CRYSTAL','MYTHRIL','ORICHALCUM',
        'CELESTITE','ASTRAL','COSMIC','ETERNAL'
      ) THEN "minChatTier"::"SupportTierLevel"
      ELSE 'STONE'::"SupportTierLevel"
    END);
  ALTER TABLE "CosplayerProfile" ALTER COLUMN "minChatTier" SET DEFAULT 'STONE'::"SupportTierLevel";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- G) PaymentIntent
CREATE TABLE IF NOT EXISTS "PaymentIntent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "paymentKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PaymentIntent_userId_status_idx" ON "PaymentIntent"("userId", "status");

-- 완료 후 터미널: npx prisma db push && npm run db:seed

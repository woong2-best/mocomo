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

-- H) VoiceCall (DM 1:1 음성 통화)
DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'DECLINED', 'MISSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VoiceCall" (
  "id" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "calleeId" TEXT NOT NULL,
  "chatRoomId" TEXT,
  "livekitRoom" TEXT NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VoiceCall_livekitRoom_key" ON "VoiceCall"("livekitRoom");
CREATE INDEX IF NOT EXISTS "VoiceCall_callerId_status_idx" ON "VoiceCall"("callerId", "status");
CREATE INDEX IF NOT EXISTS "VoiceCall_calleeId_status_idx" ON "VoiceCall"("calleeId", "status");

DO $$ BEGIN
  ALTER TABLE "VoiceCall"
    ADD CONSTRAINT "VoiceCall_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VoiceCall"
    ADD CONSTRAINT "VoiceCall_calleeId_fkey"
    FOREIGN KEY ("calleeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VoiceCall"
    ADD CONSTRAINT "VoiceCall_chatRoomId_fkey"
    FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- I) 라이브 방송: 합방 비밀번호, 채팅, 실시간 시청자
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "joinPasswordHash" TEXT;

ALTER TABLE "VoiceMember" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'VIEWER';
ALTER TABLE "VoiceMember" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "LiveChatMessage" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LiveChatMessage_channelId_createdAt_idx"
  ON "LiveChatMessage"("channelId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "LiveChatMessage"
    ADD CONSTRAINT "LiveChatMessage_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LiveChatMessage"
    ADD CONSTRAINT "LiveChatMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 완료 후 터미널: npx prisma db push && npm run db:seed

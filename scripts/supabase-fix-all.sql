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

-- H) VoiceCall (DM 1:1 음성·영상 통화)
DO $$ BEGIN
  CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED', 'DECLINED', 'MISSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CallType" AS ENUM ('AUDIO', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VoiceCall" (
  "id" TEXT NOT NULL,
  "callerId" TEXT NOT NULL,
  "calleeId" TEXT NOT NULL,
  "chatRoomId" TEXT,
  "livekitRoom" TEXT NOT NULL,
  "callType" "CallType" NOT NULL DEFAULT 'AUDIO',
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

ALTER TABLE "VoiceCall" ADD COLUMN IF NOT EXISTS "callType" "CallType" NOT NULL DEFAULT 'AUDIO';

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

-- J) 굿즈샵: 이모티콘 · 마이 스토리지 · 실물 굿즈 주문
ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'EMOTICON';
ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'LISTING_FEE';
ALTER TYPE "PaymentIntentType" ADD VALUE IF NOT EXISTS 'PHYSICAL_GOODS';

CREATE TABLE IF NOT EXISTS "EmoticonPack" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "previewUrl" TEXT NOT NULL,
  "detailUrl" TEXT,
  "assetUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmoticonPack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmoticonPack_slug_key" ON "EmoticonPack"("slug");

CREATE TABLE IF NOT EXISTS "UserEmoticon" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "pricePaid" INTEGER NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserEmoticon_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserEmoticon_userId_status_idx" ON "UserEmoticon"("userId", "status");

CREATE TABLE IF NOT EXISTS "EmoticonGift" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL,
  "creatorAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmoticonGift_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmoticonGift_itemId_key" ON "EmoticonGift"("itemId");
CREATE INDEX IF NOT EXISTS "EmoticonGift_receiverId_createdAt_idx" ON "EmoticonGift"("receiverId", "createdAt");

CREATE TABLE IF NOT EXISTS "GoodsListingRequest" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "media" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_FEE',
  "listingFeePaid" BOOLEAN NOT NULL DEFAULT false,
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GoodsListingRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GoodsListingRequest_sellerId_status_idx" ON "GoodsListingRequest"("sellerId", "status");

CREATE TABLE IF NOT EXISTS "PhysicalProduct" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "requestId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "images" JSONB NOT NULL,
  "shippingFee" INTEGER NOT NULL DEFAULT 3000,
  "stock" INTEGER NOT NULL DEFAULT 50,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysicalProduct_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhysicalProduct_requestId_key" ON "PhysicalProduct"("requestId");

CREATE TABLE IF NOT EXISTS "PhysicalOrder" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "productTotal" INTEGER NOT NULL,
  "shippingFee" INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL,
  "sellerAmount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "zipCode" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "detailAddress" TEXT,
  "trackingNo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysicalOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhysicalOrder_buyerId_idx" ON "PhysicalOrder"("buyerId");
CREATE INDEX IF NOT EXISTS "PhysicalOrder_sellerId_status_idx" ON "PhysicalOrder"("sellerId", "status");

CREATE TABLE IF NOT EXISTS "PhysicalOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" INTEGER NOT NULL,
  CONSTRAINT "PhysicalOrderItem_pkey" PRIMARY KEY ("id")
);

-- K) 중고거래
CREATE TABLE IF NOT EXISTS "UsedListing" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "status" TEXT NOT NULL DEFAULT 'SELLING',
  "region" TEXT NOT NULL,
  "images" JSONB NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsedListing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UsedListing_status_createdAt_idx" ON "UsedListing"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "UsedListing_sellerId_idx" ON "UsedListing"("sellerId");
CREATE INDEX IF NOT EXISTS "UsedListing_category_idx" ON "UsedListing"("category");
CREATE INDEX IF NOT EXISTS "UsedListing_region_idx" ON "UsedListing"("region");

CREATE TABLE IF NOT EXISTS "UsedFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsedFavorite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsedFavorite_userId_listingId_key" ON "UsedFavorite"("userId", "listingId");

DO $$ BEGIN
  ALTER TABLE "UsedListing" ADD CONSTRAINT "UsedListing_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedFavorite" ADD CONSTRAINT "UsedFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedFavorite" ADD CONSTRAINT "UsedFavorite_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- L) 정산 · 지갑 · 출금
CREATE TABLE IF NOT EXISTS "Wallet" (
  "userId" TEXT NOT NULL,
  "availableBalance" INTEGER NOT NULL DEFAULT 0,
  "totalEarned" INTEGER NOT NULL DEFAULT 0,
  "totalWithdrawn" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "paymentIntentId" TEXT,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_paymentIntentId_idx" ON "LedgerEntry"("paymentIntentId");

CREATE TABLE IF NOT EXISTS "BankAccount" (
  "userId" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "holderName" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "PayoutRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "holderName" TEXT NOT NULL,
  "adminNote" TEXT,
  "processedById" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PayoutRequest_status_createdAt_idx" ON "PayoutRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PayoutRequest_userId_idx" ON "PayoutRequest"("userId");

DO $$ BEGIN
  ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- M) User locale · country (국가·언어)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'ko';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "countryCode" TEXT NOT NULL DEFAULT 'KR';

-- N) 중고거래 휴대폰 인증 (대한민국)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;

-- O) 운영자 계정 — @mocomocompany 만 ADMIN (다른 계정은 USER 로)
UPDATE "User" SET "role" = 'USER'
WHERE "username" <> 'mocomocompany' AND "role" IN ('ADMIN', 'MODERATOR');

UPDATE "User" SET "role" = 'ADMIN'
WHERE "username" = 'mocomocompany';

-- 완료 후 터미널: npx prisma db push && npm run db:seed

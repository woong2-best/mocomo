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
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "meetPlace" VARCHAR(200);
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "meetLat" DOUBLE PRECISION;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "meetLng" DOUBLE PRECISION;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "saleType" TEXT NOT NULL DEFAULT 'FIXED';
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "auctionEndsAt" TIMESTAMP(3);
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "bidIncrement" INTEGER;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "buyNowPrice" INTEGER;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "reservePrice" INTEGER;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "currentBidAmount" INTEGER;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "currentBidderId" TEXT;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "auctionState" TEXT;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "bidCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "antiSnipeMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "auctionExtensionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UsedListing" ADD COLUMN IF NOT EXISTS "restrictedKind" TEXT NOT NULL DEFAULT 'NONE';
CREATE INDEX IF NOT EXISTS "UsedListing_restrictedKind_idx" ON "UsedListing"("restrictedKind");
CREATE INDEX IF NOT EXISTS "UsedListing_saleType_auctionEndsAt_idx" ON "UsedListing"("saleType", "auctionEndsAt");
CREATE INDEX IF NOT EXISTS "UsedListing_auctionState_idx" ON "UsedListing"("auctionState");

CREATE TABLE IF NOT EXISTS "UsedAuctionBid" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "bidderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsedAuctionBid_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UsedAuctionBid_listingId_createdAt_idx" ON "UsedAuctionBid"("listingId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "UsedAuctionBid_bidderId_createdAt_idx" ON "UsedAuctionBid"("bidderId", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "UsedAuctionBid" ADD CONSTRAINT "UsedAuctionBid_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedAuctionBid" ADD CONSTRAINT "UsedAuctionBid_bidderId_fkey"
    FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedListing" ADD CONSTRAINT "UsedListing_currentBidderId_fkey"
    FOREIGN KEY ("currentBidderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

CREATE TABLE IF NOT EXISTS "UsedListingChat" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsedListingChat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsedListingChat_roomId_key" ON "UsedListingChat"("roomId");
CREATE UNIQUE INDEX IF NOT EXISTS "UsedListingChat_listingId_buyerId_key" ON "UsedListingChat"("listingId", "buyerId");
CREATE INDEX IF NOT EXISTS "UsedListingChat_listingId_idx" ON "UsedListingChat"("listingId");

DO $$ BEGIN
  ALTER TABLE "UsedListingChat" ADD CONSTRAINT "UsedListingChat_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "UsedListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UsedListingChat" ADD CONSTRAINT "UsedListingChat_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adultVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthDate" DATE;
-- 번호 1개 = 계정 1개 (NULL 은 여러 계정 허용)
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;
-- 중복 번호 정리(수동 1회): 아래로 충돌 확인 후 오래된/미인증 계정 phone 을 NULL 로
-- SELECT phone, COUNT(*) FROM "User" WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1;

-- O) 운영자 (선택·수동 1회) — 앱은 요청마다 role 을 바꾸지 않음
--     권장: Vercel SITE_OPERATOR_USERNAME 설정 후 터미널 npm run operator:assign
-- UPDATE "User" SET "role" = 'USER'
-- WHERE "username" <> 'mocomocompany' AND "role" IN ('ADMIN', 'MODERATOR');
-- UPDATE "User" SET "role" = 'ADMIN' WHERE "username" = 'mocomocompany';

-- P) 애니 조회수 (사이드바 인기 애니 = 클릭/조회 순)
ALTER TABLE "Anime" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Anime_viewCount_idx" ON "Anime"("viewCount");

-- Q) 단체대화방 (코스어 / 친목)
ALTER TYPE "ChatRoomType" ADD VALUE IF NOT EXISTS 'COSPLAYER_GROUP';
ALTER TYPE "ChatRoomType" ADD VALUE IF NOT EXISTS 'SOCIAL_GROUP';
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "joinPasswordHash" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "requirePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "voiceChannelId" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "announcementTitle" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "announcementBody" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "announcementById" TEXT;
ALTER TABLE "ChatRoom" ADD COLUMN IF NOT EXISTS "announcementAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoom_joinCode_key" ON "ChatRoom"("joinCode") WHERE "joinCode" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoom_voiceChannelId_key" ON "ChatRoom"("voiceChannelId") WHERE "voiceChannelId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ChatPoll" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "closesAt" TIMESTAMP(3),
  "closed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatPoll_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ChatPollOption" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ChatPollOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "ChatPollVote" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatPollVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChatPollVote_pollId_userId_key" ON "ChatPollVote"("pollId", "userId");

-- R) 라이브 플랫폼 확장 (카테고리·클립·스트리머 프로필)
DO $$ BEGIN
  CREATE TYPE "LiveStreamCategory" AS ENUM ('LIVE', 'JUST_CHATTING', 'GAME', 'MUSIC', 'IRL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "LiveStreamStatus" AS ENUM ('LIVE', 'SCHEDULED', 'ENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "category" "LiveStreamCategory" NOT NULL DEFAULT 'JUST_CHATTING';
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "description" VARCHAR(500);
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "liveStatus" "LiveStreamStatus" NOT NULL DEFAULT 'LIVE';
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "slowModeSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "chatBannedWords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "donationGoalKrw" INTEGER;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "vodUrl" TEXT;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "StreamerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isPartner" BOOLEAN NOT NULL DEFAULT false,
  "bio" VARCHAR(500),
  "announcement" VARCHAR(500),
  "scheduleNote" VARCHAR(300),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StreamerProfile_userId_key" ON "StreamerProfile"("userId");

CREATE TABLE IF NOT EXISTS "StreamClip" (
  "id" TEXT NOT NULL,
  "channelId" TEXT,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "durationSec" INTEGER NOT NULL DEFAULT 0,
  "isVertical" BOOLEAN NOT NULL DEFAULT false,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamClip_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StreamClip_createdAt_idx" ON "StreamClip"("createdAt");
CREATE INDEX IF NOT EXISTS "StreamClip_likeCount_idx" ON "StreamClip"("likeCount");

CREATE TABLE IF NOT EXISTS "StreamClipLike" (
  "id" TEXT NOT NULL,
  "clipId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamClipLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StreamClipLike_clipId_userId_key" ON "StreamClipLike"("clipId", "userId");

CREATE TABLE IF NOT EXISTS "StreamClipComment" (
  "id" TEXT NOT NULL,
  "clipId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamClipComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StreamClipComment_clipId_createdAt_idx" ON "StreamClipComment"("clipId", "createdAt");

-- S) 라이브 신고 타입
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'LIVE_CHANNEL';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'LIVE_CHAT';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'STREAM_CLIP';

-- T) LiveKit 녹화(Egress) ID
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "egressId" TEXT;

-- U) OBS(RTMP) 송출
DO $$ BEGIN
  CREATE TYPE "LiveBroadcastMode" AS ENUM ('BROWSER', 'OBS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "broadcastMode" "LiveBroadcastMode" NOT NULL DEFAULT 'BROWSER';
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "rtmpIngressId" TEXT;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "rtmpUrl" TEXT;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "rtmpStreamKey" TEXT;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "livePublisherTabId" VARCHAR(64);

-- U-2) 계정당 고유 OBS 방송 키 (User)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "obsRtmpStreamKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_obsRtmpStreamKey_key" ON "User"("obsRtmpStreamKey") WHERE "obsRtmpStreamKey" IS NOT NULL;

-- W) 라이브 공개/비공개 시청
DO $$ BEGIN
  CREATE TYPE "LiveVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "liveVisibility" "LiveVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "VoiceChannel" ADD COLUMN IF NOT EXISTS "minViewerTier" "SupportTierLevel";

-- V) Repost (리트윗/리포스트)
CREATE TABLE IF NOT EXISTS "Repost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Repost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Repost_userId_postId_key" ON "Repost"("userId", "postId");
CREATE INDEX IF NOT EXISTS "Repost_postId_idx" ON "Repost"("postId");

DO $$ BEGIN
  ALTER TABLE "Repost"
    ADD CONSTRAINT "Repost_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Repost"
    ADD CONSTRAINT "Repost_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- X) 성능 인덱스 (검색 · 피드 · 라이브 · 후원) — 상세는 scripts/supabase-performance-indexes.sql
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "User_username_trgm_idx"
  ON "User" USING gin (lower("username") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
  ON "User" USING gin (lower("name") gin_trgm_ops) WHERE "name" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Post_createdAt_desc_idx" ON "Post" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_hotScore_createdAt_idx" ON "Post" ("hotScore" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx"
  ON "Post" USING gin (lower("title") gin_trgm_ops) WHERE "title" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Anime_title_trgm_idx"
  ON "Anime" USING gin (lower("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Anime_titleEn_trgm_idx"
  ON "Anime" USING gin (lower("titleEn") gin_trgm_ops) WHERE "titleEn" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "VoiceChannel_live_feed_idx"
  ON "VoiceChannel" ("isLive", "liveStatus", "createdAt" DESC) WHERE "isLive" = true;
CREATE INDEX IF NOT EXISTS "VoiceChannel_live_category_idx"
  ON "VoiceChannel" ("isLive", "liveStatus", "category", "createdAt" DESC)
  WHERE "isLive" = true AND "liveStatus" = 'LIVE';
CREATE INDEX IF NOT EXISTS "VoiceChannel_name_trgm_live_idx"
  ON "VoiceChannel" USING gin (lower("name") gin_trgm_ops) WHERE "isLive" = true;

CREATE INDEX IF NOT EXISTS "VoiceMember_channelId_lastSeenAt_idx"
  ON "VoiceMember" ("channelId", "lastSeenAt" DESC);
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow" ("followerId");

CREATE INDEX IF NOT EXISTS "LiveChatMessage_channelId_userId_createdAt_idx"
  ON "LiveChatMessage" ("channelId", "userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Tip_receiverId_createdAt_idx"
  ON "Tip" ("receiverId", "createdAt" DESC);

-- 완료 후 터미널: npx prisma db push && npm run db:seed

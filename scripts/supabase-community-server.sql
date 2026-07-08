-- Community Server (Discord-like) schema — run on Supabase PostgreSQL
-- Safe to re-run: uses IF NOT EXISTS / DO blocks

-- Enums
DO $$ BEGIN
  CREATE TYPE "CommunityChannelType" AS ENUM (
    'POSTS', 'TEXT', 'VOICE', 'VIDEO', 'LIVE', 'ANNOUNCEMENT',
    'EVENT', 'QA', 'GALLERY', 'FILE', 'MEMBERS', 'SETTINGS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityPresenceStatus" AS ENUM ('ONLINE', 'IDLE', 'DND', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityRoleType" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'VIP', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CommunityMember extensions
ALTER TABLE "CommunityMember" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "CommunityMember" ADD COLUMN IF NOT EXISTS "presence" "CommunityPresenceStatus" NOT NULL DEFAULT 'OFFLINE';
ALTER TABLE "CommunityMember" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CommunityMember_communityId_presence_idx"
  ON "CommunityMember"("communityId", "presence");

-- Channel categories
CREATE TABLE IF NOT EXISTS "CommunityChannelCategory" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityChannelCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommunityChannelCategory_communityId_position_idx"
  ON "CommunityChannelCategory"("communityId", "position");

-- Channels
CREATE TABLE IF NOT EXISTS "CommunityChannel" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "categoryId" TEXT,
  "type" "CommunityChannelType" NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "topic" VARCHAR(500),
  "position" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "chatRoomId" TEXT,
  "voiceChannelId" TEXT,
  "maxUsers" INTEGER,
  "slowModeSec" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannel_chatRoomId_key" ON "CommunityChannel"("chatRoomId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannel_voiceChannelId_key" ON "CommunityChannel"("voiceChannelId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannel_communityId_slug_key" ON "CommunityChannel"("communityId", "slug");
CREATE INDEX IF NOT EXISTS "CommunityChannel_communityId_position_idx" ON "CommunityChannel"("communityId", "position");
CREATE INDEX IF NOT EXISTS "CommunityChannel_communityId_type_idx" ON "CommunityChannel"("communityId", "type");

-- Roles
CREATE TABLE IF NOT EXISTS "CommunityRole" (
  "id" TEXT NOT NULL,
  "communityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "CommunityRoleType" NOT NULL DEFAULT 'MEMBER',
  "color" VARCHAR(7),
  "position" INTEGER NOT NULL DEFAULT 0,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityRole_communityId_name_key" ON "CommunityRole"("communityId", "name");
CREATE INDEX IF NOT EXISTS "CommunityRole_communityId_position_idx" ON "CommunityRole"("communityId", "position");

-- Member roles (many-to-many)
CREATE TABLE IF NOT EXISTS "CommunityMemberRole" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  CONSTRAINT "CommunityMemberRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityMemberRole_memberId_roleId_key"
  ON "CommunityMemberRole"("memberId", "roleId");

-- Channel read state
CREATE TABLE IF NOT EXISTS "CommunityChannelRead" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageId" TEXT,
  CONSTRAINT "CommunityChannelRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityChannelRead_channelId_userId_key"
  ON "CommunityChannelRead"("channelId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityChannelRead_userId_idx" ON "CommunityChannelRead"("userId");

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "CommunityChannelCategory"
    ADD CONSTRAINT "CommunityChannelCategory_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityChannel"
    ADD CONSTRAINT "CommunityChannel_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityChannel"
    ADD CONSTRAINT "CommunityChannel_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "CommunityChannelCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityChannel"
    ADD CONSTRAINT "CommunityChannel_chatRoomId_fkey"
    FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityChannel"
    ADD CONSTRAINT "CommunityChannel_voiceChannelId_fkey"
    FOREIGN KEY ("voiceChannelId") REFERENCES "VoiceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityRole"
    ADD CONSTRAINT "CommunityRole_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityMemberRole"
    ADD CONSTRAINT "CommunityMemberRole_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "CommunityMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityMemberRole"
    ADD CONSTRAINT "CommunityMemberRole_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "CommunityRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityChannelRead"
    ADD CONSTRAINT "CommunityChannelRead_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "CommunityChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Live studio: fixed title/category + streamer-scoped bans & staff

ALTER TABLE "StreamerProfile" ADD COLUMN IF NOT EXISTS "defaultTitle" VARCHAR(120);
ALTER TABLE "StreamerProfile" ADD COLUMN IF NOT EXISTS "defaultCategory" "LiveStreamCategory";

CREATE TABLE IF NOT EXISTS "StreamerChatBan" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamerChatBan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StreamerStaffAssignment" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BroadcastRole" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerChatBan_hostUserId_userId_key" ON "StreamerChatBan"("hostUserId", "userId");
CREATE INDEX IF NOT EXISTS "StreamerChatBan_hostUserId_idx" ON "StreamerChatBan"("hostUserId");
CREATE INDEX IF NOT EXISTS "StreamerChatBan_userId_idx" ON "StreamerChatBan"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "StreamerStaffAssignment_hostUserId_userId_key" ON "StreamerStaffAssignment"("hostUserId", "userId");
CREATE INDEX IF NOT EXISTS "StreamerStaffAssignment_hostUserId_role_idx" ON "StreamerStaffAssignment"("hostUserId", "role");
CREATE INDEX IF NOT EXISTS "StreamerStaffAssignment_userId_idx" ON "StreamerStaffAssignment"("userId");

DO $$ BEGIN
  ALTER TABLE "StreamerChatBan" ADD CONSTRAINT "StreamerChatBan_hostUserId_fkey"
    FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StreamerChatBan" ADD CONSTRAINT "StreamerChatBan_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StreamerChatBan" ADD CONSTRAINT "StreamerChatBan_bannedBy_fkey"
    FOREIGN KEY ("bannedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StreamerStaffAssignment" ADD CONSTRAINT "StreamerStaffAssignment_hostUserId_fkey"
    FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StreamerStaffAssignment" ADD CONSTRAINT "StreamerStaffAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StreamerStaffAssignment" ADD CONSTRAINT "StreamerStaffAssignment_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
CREATE TYPE "BroadcastRole" AS ENUM ('MANAGER', 'MODERATOR', 'VIP');

-- AlterTable
ALTER TABLE "VoiceChannel" ADD COLUMN "chatFollowersOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoiceChannel" ADD COLUMN "chatSubscribersOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VoiceChannel" ADD COLUMN "chatMinTierExempt" "SupportTierLevel";

-- CreateTable
CREATE TABLE "BroadcastRoleAssignment" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BroadcastRole" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastRoleLog" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "oldRole" "BroadcastRole",
    "newRole" "BroadcastRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastRoleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatBan" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatTimeout" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timedOutBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatTimeout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BroadcastRoleAssignment_channelId_userId_key" ON "BroadcastRoleAssignment"("channelId", "userId");
CREATE INDEX "BroadcastRoleAssignment_channelId_role_idx" ON "BroadcastRoleAssignment"("channelId", "role");
CREATE INDEX "BroadcastRoleAssignment_userId_idx" ON "BroadcastRoleAssignment"("userId");

CREATE INDEX "BroadcastRoleLog_channelId_createdAt_idx" ON "BroadcastRoleLog"("channelId", "createdAt" DESC);
CREATE INDEX "BroadcastRoleLog_targetUserId_createdAt_idx" ON "BroadcastRoleLog"("targetUserId", "createdAt" DESC);

CREATE UNIQUE INDEX "LiveChatBan_channelId_userId_key" ON "LiveChatBan"("channelId", "userId");
CREATE INDEX "LiveChatBan_channelId_idx" ON "LiveChatBan"("channelId");

CREATE INDEX "LiveChatTimeout_channelId_userId_expiresAt_idx" ON "LiveChatTimeout"("channelId", "userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "BroadcastRoleAssignment" ADD CONSTRAINT "BroadcastRoleAssignment_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastRoleAssignment" ADD CONSTRAINT "BroadcastRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastRoleAssignment" ADD CONSTRAINT "BroadcastRoleAssignment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastRoleLog" ADD CONSTRAINT "BroadcastRoleLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastRoleLog" ADD CONSTRAINT "BroadcastRoleLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastRoleLog" ADD CONSTRAINT "BroadcastRoleLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveChatBan" ADD CONSTRAINT "LiveChatBan_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatBan" ADD CONSTRAINT "LiveChatBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatBan" ADD CONSTRAINT "LiveChatBan_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveChatTimeout" ADD CONSTRAINT "LiveChatTimeout_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatTimeout" ADD CONSTRAINT "LiveChatTimeout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveChatTimeout" ADD CONSTRAINT "LiveChatTimeout_timedOutBy_fkey" FOREIGN KEY ("timedOutBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

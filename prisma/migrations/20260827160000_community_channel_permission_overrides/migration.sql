-- CreateEnum
CREATE TYPE "CommunityChannelOverrideTarget" AS ENUM ('ROLE', 'USER');

-- CreateTable
CREATE TABLE "CommunityChannelPermissionOverride" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "targetType" "CommunityChannelOverrideTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "allow" JSONB NOT NULL DEFAULT '{}',
    "deny" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityChannelPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityChannelPermissionOverride_channelId_idx" ON "CommunityChannelPermissionOverride"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityChannelPermissionOverride_channelId_targetType_targetId_key" ON "CommunityChannelPermissionOverride"("channelId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "CommunityChannelPermissionOverride" ADD CONSTRAINT "CommunityChannelPermissionOverride_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "CommunityChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "MocoDonationType" AS ENUM ('VIDEO', 'TTS', 'CHAT');

-- CreateEnum
CREATE TYPE "MocoDonationStatus" AS ENUM ('PENDING', 'PLAYING', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "MocoDonation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mocoAmount" INTEGER NOT NULL,
    "type" "MocoDonationType" NOT NULL,
    "mediaUrl" TEXT,
    "message" TEXT,
    "ttsVoice" TEXT,
    "maxPlaySec" INTEGER NOT NULL DEFAULT 60,
    "status" "MocoDonationStatus" NOT NULL DEFAULT 'PENDING',
    "giftEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MocoDonation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MocoDonation_channelId_status_createdAt_idx" ON "MocoDonation"("channelId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MocoDonation_streamerId_createdAt_idx" ON "MocoDonation"("streamerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MocoDonation_userId_createdAt_idx" ON "MocoDonation"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MocoDonation" ADD CONSTRAINT "MocoDonation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MocoDonation" ADD CONSTRAINT "MocoDonation_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MocoDonation" ADD CONSTRAINT "MocoDonation_userId_fkey" FOREIGN KEY ("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MocoDonation" ADD CONSTRAINT "MocoDonation_giftEventId_fkey" FOREIGN KEY ("giftEventId") REFERENCES "GiftEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

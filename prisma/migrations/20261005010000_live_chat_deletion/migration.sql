-- CreateTable
CREATE TABLE "LiveChatDeletion" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveChatDeletion_channelId_messageId_key" ON "LiveChatDeletion"("channelId", "messageId");

-- CreateIndex
CREATE INDEX "LiveChatDeletion_channelId_deletedAt_idx" ON "LiveChatDeletion"("channelId", "deletedAt");

-- AddForeignKey
ALTER TABLE "LiveChatDeletion" ADD CONSTRAINT "LiveChatDeletion_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "VoiceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

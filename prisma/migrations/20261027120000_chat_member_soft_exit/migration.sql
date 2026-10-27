-- Soft-leave for 1:1 chats. The room and messages stay; each member
-- can hide the thread from their own inbox (Instagram-style).

ALTER TABLE "ChatMember" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ChatMember" ADD COLUMN IF NOT EXISTS "leftAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ChatMember_userId_isActive_idx" ON "ChatMember"("userId", "isActive");

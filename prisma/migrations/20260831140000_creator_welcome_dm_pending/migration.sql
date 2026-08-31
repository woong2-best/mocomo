-- 미성년(미인증) 팔로워 웰컴 DM 지연 발송
CREATE TABLE "creator_welcome_dm_pending" (
    "creatorId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_welcome_dm_pending_pkey" PRIMARY KEY ("creatorId","followerId")
);

CREATE INDEX "creator_welcome_dm_pending_followerId_createdAt_idx"
  ON "creator_welcome_dm_pending"("followerId", "createdAt");

ALTER TABLE "creator_welcome_dm_pending"
  ADD CONSTRAINT "creator_welcome_dm_pending_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_welcome_dm_pending"
  ADD CONSTRAINT "creator_welcome_dm_pending_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

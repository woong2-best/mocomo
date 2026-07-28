-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "postsLocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "FollowRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FollowRequest_targetId_createdAt_idx" ON "FollowRequest"("targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FollowRequest_requesterId_idx" ON "FollowRequest"("requesterId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FollowRequest_requesterId_targetId_key" ON "FollowRequest"("requesterId", "targetId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FollowRequest" ADD CONSTRAINT "FollowRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

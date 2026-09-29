-- AlterTable
ALTER TABLE "Post" ADD COLUMN "quotedPostId" TEXT;

-- CreateIndex
CREATE INDEX "Post_quotedPostId_idx" ON "Post"("quotedPostId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotedPostId_fkey" FOREIGN KEY ("quotedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Repost_userId_createdAt_idx" ON "Repost"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Repost_createdAt_idx" ON "Repost"("createdAt" DESC);

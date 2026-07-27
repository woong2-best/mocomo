-- Comment likes, pins, soft hide/delete
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Comment_postId_parentId_likeCount_createdAt_idx"
  ON "Comment"("postId", "parentId", "likeCount" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Comment_postId_pinnedAt_idx"
  ON "Comment"("postId", "pinnedAt");

CREATE TABLE IF NOT EXISTS "CommentLike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommentLike_userId_commentId_key"
  ON "CommentLike"("userId", "commentId");
CREATE INDEX IF NOT EXISTS "CommentLike_commentId_createdAt_idx"
  ON "CommentLike"("commentId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CommentLike_userId_createdAt_idx"
  ON "CommentLike"("userId", "createdAt" DESC);

DO $$ BEGIN
  ALTER TABLE "CommentLike"
    ADD CONSTRAINT "CommentLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommentLike"
    ADD CONSTRAINT "CommentLike_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

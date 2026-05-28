-- ============================================================
-- 리트윗 + 댓글만 안 될 때 (STAR/북마크는 되는 경우)
-- Supabase SQL Editor에 붙여넣고 Run 한 번만 실행
-- https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/sql/new
-- ============================================================

-- 1) Repost 테이블 (리트윗) — STAR(Bookmark)와 별도, 이게 없으면 리트윗만 실패
CREATE TABLE IF NOT EXISTS "Repost" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Repost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Repost_userId_postId_key" ON "Repost"("userId", "postId");
CREATE INDEX IF NOT EXISTS "Repost_postId_idx" ON "Repost"("postId");

DO $$ BEGIN
  ALTER TABLE "Repost"
    ADD CONSTRAINT "Repost_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Repost"
    ADD CONSTRAINT "Repost_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Comment 컬럼 보강 (댓글 등록/대댓글) — 테이블은 있는데 컬럼만 없을 때
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  ALTER TABLE "Comment"
    ADD CONSTRAINT "Comment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Instagram-style 2-level threads: keep parentId as the root comment,
-- and record who the reply is addressed to.

ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "replyToUserId" TEXT;

-- Existing replies: address the immediate parent author.
UPDATE "Comment" AS c
SET "replyToUserId" = p."authorId"
FROM "Comment" AS p
WHERE c."parentId" = p.id
  AND c."replyToUserId" IS NULL;

-- Flatten any reply-to-reply rows onto the top-level comment.
WITH RECURSIVE ancestry AS (
  SELECT id, "parentId", id AS root_id
  FROM "Comment"
  WHERE "parentId" IS NULL
  UNION ALL
  SELECT c.id, c."parentId", a.root_id
  FROM "Comment" AS c
  JOIN ancestry AS a ON c."parentId" = a.id
)
UPDATE "Comment" AS c
SET "parentId" = a.root_id
FROM ancestry AS a
WHERE c.id = a.id
  AND c."parentId" IS NOT NULL
  AND a.root_id IS DISTINCT FROM c."parentId";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Comment_replyToUserId_fkey'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_replyToUserId_fkey"
      FOREIGN KEY ("replyToUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Comment_replyToUserId_idx" ON "Comment"("replyToUserId");

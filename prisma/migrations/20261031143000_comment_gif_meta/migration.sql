-- GIPHY creator/title metadata for comment GIFs (Supabase JSONB).
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "mediaMeta" JSONB;

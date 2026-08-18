-- =============================================================================
-- MoCoMo 성능 인덱스 (Supabase SQL Editor에서 실행)
-- 검색 · 홈 피드 · 라이브 허브 · 후원 stats · 채팅 슬로우모드 가속
-- 안전: IF NOT EXISTS / CONCURRENTLY 없음 (Supabase UI에서 한 번에 실행)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- 1) 통합 검색 (runFastSearch /api/search)
-- -----------------------------------------------------------------------------

-- 유저: @username, 이름 (ILIKE contains / startsWith)
CREATE INDEX IF NOT EXISTS "User_username_trgm_idx"
  ON "User" USING gin (lower("username") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
  ON "User" USING gin (lower("name") gin_trgm_ops)
  WHERE "name" IS NOT NULL;

-- 게시글: 제목·본문 검색 + 피드 정렬
CREATE INDEX IF NOT EXISTS "Post_createdAt_desc_idx"
  ON "Post" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Post_hotScore_createdAt_idx"
  ON "Post" ("hotScore" DESC, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx"
  ON "Post" USING gin (lower("title") gin_trgm_ops)
  WHERE "title" IS NOT NULL;

-- 본문 검색(4자 이상)용 — 테이블이 크면 생성에 시간이 걸릴 수 있음
CREATE INDEX IF NOT EXISTS "Post_content_trgm_idx"
  ON "Post" USING gin (lower(left("content", 2000)) gin_trgm_ops);

-- 애니: 제목 / 영문 제목
CREATE INDEX IF NOT EXISTS "Anime_title_trgm_idx"
  ON "Anime" USING gin (lower("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Anime_titleEn_trgm_idx"
  ON "Anime" USING gin (lower("titleEn") gin_trgm_ops)
  WHERE "titleEn" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Anime_updatedAt_desc_idx"
  ON "Anime" ("updatedAt" DESC);

-- 라이브 방송명 검색
CREATE INDEX IF NOT EXISTS "VoiceChannel_name_trgm_live_idx"
  ON "VoiceChannel" USING gin (lower("name") gin_trgm_ops)
  WHERE "isLive" = true;

-- -----------------------------------------------------------------------------
-- 2) 라이브 허브 · 시청자 수 · 예약 방송
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "VoiceChannel_live_feed_idx"
  ON "VoiceChannel" ("isLive", "liveStatus", "createdAt" DESC)
  WHERE "isLive" = true;

CREATE INDEX IF NOT EXISTS "VoiceChannel_live_category_idx"
  ON "VoiceChannel" ("isLive", "liveStatus", "category", "createdAt" DESC)
  WHERE "isLive" = true AND "liveStatus" = 'LIVE';

CREATE INDEX IF NOT EXISTS "VoiceChannel_scheduled_idx"
  ON "VoiceChannel" ("liveStatus", "scheduledAt" ASC)
  WHERE "liveStatus" = 'SCHEDULED';

-- 시청자 presence / groupBy
CREATE INDEX IF NOT EXISTS "VoiceMember_channelId_lastSeenAt_idx"
  ON "VoiceMember" ("channelId", "lastSeenAt" DESC);

CREATE INDEX IF NOT EXISTS "VoiceMember_lastSeenAt_idx"
  ON "VoiceMember" ("lastSeenAt" DESC);

-- 팔로우 중 라이브 (fetchFollowedLive)
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"
  ON "Follow" ("followerId");

CREATE INDEX IF NOT EXISTS "VoiceChannel_createdBy_live_idx"
  ON "VoiceChannel" ("createdBy", "isLive", "liveStatus")
  WHERE "isLive" = true;

-- -----------------------------------------------------------------------------
-- 3) 라이브 채팅 · 후원 stats API
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "LiveChatMessage_channelId_userId_createdAt_idx"
  ON "LiveChatMessage" ("channelId", "userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Tip_receiverId_createdAt_idx"
  ON "Tip" ("receiverId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Tip_receiverId_senderId_idx"
  ON "Tip" ("receiverId", "senderId");

-- -----------------------------------------------------------------------------
-- 4) 기타 자주 쓰는 조회
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "Like_userId_postId_idx"
  ON "Like" ("userId", "postId");

CREATE INDEX IF NOT EXISTS "Bookmark_userId_postId_idx"
  ON "Bookmark" ("userId", "postId");

CREATE INDEX IF NOT EXISTS "Like_createdAt_desc_idx"
  ON "Like" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Like_postId_createdAt_desc_idx"
  ON "Like" ("postId", "createdAt" DESC);

-- 완료 후 (선택): ANALYZE로 통계 갱신
ANALYZE "User";
ANALYZE "Post";
ANALYZE "Anime";
ANALYZE "VoiceChannel";
ANALYZE "VoiceMember";
ANALYZE "LiveChatMessage";
ANALYZE "Tip";
ANALYZE "Like";

import { db } from "@/lib/db";

/** 프로필 방문 — 동일 유저에 대해 upsert로 카운트 증가 */
export async function recordProfileVisit(visitorId: string, profileUserId: string) {
  if (!visitorId || !profileUserId || visitorId === profileUserId) return;
  const now = new Date();
  await db.profileVisit.upsert({
    where: {
      visitorId_profileUserId: { visitorId, profileUserId },
    },
    create: {
      visitorId,
      profileUserId,
      visitCount: 1,
      firstVisitedAt: now,
      lastVisitedAt: now,
    },
    update: {
      visitCount: { increment: 1 },
      lastVisitedAt: now,
    },
  });
}

/** 게시물 조회 이력 (집계 viewCount와 별도) */
export async function recordPostViewEvent(
  userId: string,
  postId: string,
  authorId: string
) {
  if (!userId || !postId || !authorId || userId === authorId) return;
  const now = new Date();
  await db.postViewEvent.upsert({
    where: { userId_postId: { userId, postId } },
    create: {
      userId,
      postId,
      authorId,
      viewCount: 1,
      firstViewedAt: now,
      lastViewedAt: now,
    },
    update: {
      viewCount: { increment: 1 },
      lastViewedAt: now,
    },
  });
}

/** 영상 시청 이력 */
export async function recordVideoWatch(opts: {
  userId: string;
  postId: string;
  authorId: string;
  mediaId?: string | null;
  watchSeconds?: number;
}) {
  const { userId, postId, authorId, mediaId, watchSeconds = 0 } = opts;
  if (!userId || !postId || !authorId || userId === authorId) return;
  const now = new Date();
  await db.videoWatchEvent.upsert({
    where: { userId_postId: { userId, postId } },
    create: {
      userId,
      postId,
      authorId,
      mediaId: mediaId ?? null,
      watchSeconds: Math.max(0, watchSeconds),
      watchCount: 1,
      firstWatchedAt: now,
      lastWatchedAt: now,
    },
    update: {
      watchCount: { increment: 1 },
      watchSeconds: { increment: Math.max(0, watchSeconds) },
      lastWatchedAt: now,
      ...(mediaId ? { mediaId } : {}),
    },
  });
}

/** 라이브 시청 이력 — heartbeat마다 초 단위 누적 */
export async function recordLiveWatch(opts: {
  userId: string;
  channelId: string;
  hostUserId: string;
  addSeconds?: number;
}) {
  const { userId, channelId, hostUserId, addSeconds = 30 } = opts;
  if (!userId || !channelId || !hostUserId || userId === hostUserId) return;
  const now = new Date();
  const existing = await db.liveWatchEvent.findUnique({
    where: { userId_channelId: { userId, channelId } },
    select: { id: true, lastWatchedAt: true },
  });
  if (!existing) {
    await db.liveWatchEvent.create({
      data: {
        userId,
        channelId,
        hostUserId,
        watchSeconds: Math.max(0, addSeconds),
        sessionCount: 1,
        firstWatchedAt: now,
        lastWatchedAt: now,
      },
    });
    return;
  }
  const gapMs = now.getTime() - existing.lastWatchedAt.getTime();
  const newSession = gapMs > 15 * 60 * 1000;
  await db.liveWatchEvent.update({
    where: { id: existing.id },
    data: {
      watchSeconds: { increment: Math.max(0, addSeconds) },
      lastWatchedAt: now,
      ...(newSession ? { sessionCount: { increment: 1 } } : {}),
    },
  });
}

import { db } from "@/lib/db";

function dateKeyUTC(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** 활성 사용자 성장률 스냅샷 (팔로워·좋아요·조회수 시계열) */
export async function snapshotUserGrowth(opts?: {
  userIds?: string[];
  /** 최근 로그인 N일 (userIds 미지정 시) */
  activeDays?: number;
  limit?: number;
}) {
  const dateKey = dateKeyUTC();
  let userIds = opts?.userIds;

  if (!userIds?.length) {
    const since = new Date(
      Date.now() - (opts?.activeDays ?? 14) * 24 * 60 * 60 * 1000
    );
    const active = await db.user.findMany({
      where: {
        deletedAt: null,
        isBanned: false,
        OR: [{ lastLoginAt: { gte: since } }, { createdAt: { gte: since } }],
      },
      select: { id: true },
      take: opts?.limit ?? 500,
      orderBy: { lastLoginAt: "desc" },
    });
    userIds = active.map((u) => u.id);
  }

  let written = 0;
  for (const userId of userIds) {
    const [followerCount, followingCount, postCount, posts] = await Promise.all([
      db.follow.count({ where: { followingId: userId } }),
      db.follow.count({ where: { followerId: userId } }),
      db.post.count({ where: { authorId: userId } }),
      db.post.findMany({
        where: { authorId: userId },
        select: { id: true, viewCount: true },
        take: 2000,
      }),
    ]);
    const postIds = posts.map((p) => p.id);
    const postViewCount = posts.reduce((s, p) => s + p.viewCount, 0);
    const [likeReceivedCount, commentReceivedCount] = await Promise.all([
      postIds.length
        ? db.like.count({ where: { postId: { in: postIds } } })
        : Promise.resolve(0),
      postIds.length
        ? db.comment.count({ where: { postId: { in: postIds } } })
        : Promise.resolve(0),
    ]);

    await db.userGrowthSnapshot.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      create: {
        userId,
        dateKey,
        followerCount,
        followingCount,
        postCount,
        likeReceivedCount,
        commentReceivedCount,
        postViewCount,
      },
      update: {
        followerCount,
        followingCount,
        postCount,
        likeReceivedCount,
        commentReceivedCount,
        postViewCount,
      },
    });
    written += 1;
  }

  return { dateKey, written };
}

/** 추천 캐시 만료/활성 사용자 재계산 */
export async function refreshFollowRecommendationCaches(opts?: {
  limit?: number;
  forceAllActive?: boolean;
}) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      isBanned: false,
      OR: [{ lastLoginAt: { gte: since } }, { createdAt: { gte: since } }],
    },
    select: { id: true },
    take: opts?.limit ?? 200,
    orderBy: { lastLoginAt: "desc" },
  });

  const { computeFollowRecommendations } = await import(
    "@/lib/follow-recommendations/compute"
  );

  let refreshed = 0;
  for (const u of users) {
    if (!opts?.forceAllActive) {
      const fresh = await db.followRecommendation.count({
        where: { userId: u.id, expiresAt: { gt: new Date() } },
      });
      if (fresh >= 5) continue;
    }
    try {
      await computeFollowRecommendations(u.id);
      refreshed += 1;
    } catch (e) {
      console.error(`[follow-rec] refresh ${u.id}`, e);
    }
  }
  return { candidates: users.length, refreshed };
}

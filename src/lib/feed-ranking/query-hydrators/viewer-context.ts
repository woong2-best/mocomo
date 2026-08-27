import { db } from "@/lib/db";
import { buildFeedParams } from "@/lib/feed-ranking/params";
import type { FeedQuery } from "@/lib/feed-ranking/types";
import { NEW_USER_DAYS } from "@/lib/feed-ranking/types";
import type { QueryHydrator } from "@/lib/feed-ranking/pipeline/types";

/** X QueryHydrators — 뷰어 그래프·행동 시퀀스·차단 목록 */
export const viewerContextHydrator: QueryHydrator<FeedQuery> = {
  id: "viewer_context",
  async hydrate(query) {
    const userId = query.userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        locale: true,
        countryCode: true,
        createdAt: true,
        profile: { select: { favoriteTags: true } },
      },
    });
    if (!user) return query;

    const [
      following,
      blocks,
      mutes,
      communities,
      animes,
      seenPosts,
    ] = await Promise.all([
      db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
        take: 500,
      }),
      db.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
        take: 500,
      }),
      db.userMute.findMany({
        where: { muterId: userId },
        select: { mutedId: true },
        take: 500,
      }),
      db.communityMember.findMany({
        where: { userId },
        select: { communityId: true },
        take: 80,
      }),
      db.animeFollow.findMany({
        where: { userId },
        select: { animeId: true },
        take: 80,
      }),
      db.postViewEvent.findMany({
        where: { userId },
        select: { postId: true },
        orderBy: { lastViewedAt: "desc" },
        take: 500,
      }),
    ]);

    const ageMs = Date.now() - user.createdAt.getTime();

    return {
      ...query,
      locale: user.locale || "ko",
      countryCode: user.countryCode || "KR",
      params: query.params ?? buildFeedParams(),
      followingIds: new Set(following.map((f) => f.followingId)),
      blockedIds: new Set(blocks.map((b) => b.blockedId)),
      mutedIds: new Set(mutes.map((m) => m.mutedId)),
      communityIds: new Set(communities.map((c) => c.communityId)),
      animeIds: new Set(animes.map((a) => a.animeId)),
      seenPostIds: new Set(seenPosts.map((s) => s.postId)),
      favoriteTags: user.profile?.favoriteTags ?? [],
      isNewUser: ageMs < NEW_USER_DAYS * 24 * 60 * 60 * 1000,
    };
  },
};

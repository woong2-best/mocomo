import { db } from "@/lib/db";
import type { SignalProvider, ViewerContext } from "@/lib/follow-recommendations/types";
import { isEligibleCandidateWhere } from "@/lib/follow-recommendations/exclude";

function emptyBatch(): Map<
  string,
  { score: number; label?: string; meta?: Record<string, unknown> }
> {
  return new Map();
}

function clamp(n: number, max = 100) {
  return Math.max(0, Math.min(max, n));
}

/** 2. 공통 팔로우 */
export const commonFollowSignal: SignalProvider = {
  id: "common_follow",
  weight: 1.4,
  async suggestCandidates(ctx, limit) {
    if (ctx.followingIds.size === 0) return [];
    const following = [...ctx.followingIds].slice(0, 80);
    const rows = await db.follow.findMany({
      where: {
        followingId: { in: following },
        followerId: { not: ctx.userId },
      },
      select: { followerId: true },
      take: limit * 8,
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.followerId, (counts.get(r.followerId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (candidateIds.length === 0 || ctx.followingIds.size === 0) return out;
    const following = [...ctx.followingIds].slice(0, 100);
    const rows = await db.follow.findMany({
      where: {
        followerId: { in: candidateIds },
        followingId: { in: following },
      },
      select: { followerId: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.followerId, (counts.get(r.followerId) ?? 0) + 1);
    }
    // 나를 팔로우하는 사람과 비슷한 사람 (공통 관심 대상)
    const myFollowers = [...ctx.followerIds].slice(0, 40);
    let foafBoost = new Map<string, number>();
    if (myFollowers.length > 0) {
      const foaf = await db.follow.findMany({
        where: {
          followerId: { in: myFollowers },
          followingId: { in: candidateIds },
        },
        select: { followingId: true },
      });
      foafBoost = new Map();
      for (const r of foaf) {
        foafBoost.set(r.followingId, (foafBoost.get(r.followingId) ?? 0) + 1);
      }
    }
    for (const id of candidateIds) {
      const common = counts.get(id) ?? 0;
      const boost = foafBoost.get(id) ?? 0;
      if (common === 0 && boost === 0) continue;
      out.set(id, {
        score: clamp(common * 18 + boost * 8),
        label: common > 0 ? `공통 팔로우 ${common}` : undefined,
        meta: { commonFollowCount: common },
      });
    }
    return out;
  },
};

/** 3. 관심사 (favoriteTags + 애니 팔로우) */
export const interestSignal: SignalProvider = {
  id: "interest",
  weight: 1.2,
  async suggestCandidates(ctx, limit) {
    if (ctx.favoriteTags.length === 0 && ctx.animeIds.size === 0) return [];
    const [byTags, byAnime] = await Promise.all([
      ctx.favoriteTags.length
        ? db.profile.findMany({
            where: { favoriteTags: { hasSome: ctx.favoriteTags.slice(0, 12) } },
            select: { userId: true },
            take: limit * 2,
          })
        : Promise.resolve([]),
      ctx.animeIds.size
        ? db.animeFollow.findMany({
            where: { animeId: { in: [...ctx.animeIds].slice(0, 30) } },
            select: { userId: true },
            take: limit * 3,
          })
        : Promise.resolve([]),
    ]);
    const ids = new Set<string>();
    for (const r of byTags) ids.add(r.userId);
    for (const r of byAnime) ids.add(r.userId);
    ids.delete(ctx.userId);
    return [...ids].slice(0, limit);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (candidateIds.length === 0) return out;
    const profiles = await db.profile.findMany({
      where: { userId: { in: candidateIds } },
      select: { userId: true, favoriteTags: true },
    });
    const animeRows =
      ctx.animeIds.size > 0
        ? await db.animeFollow.findMany({
            where: {
              userId: { in: candidateIds },
              animeId: { in: [...ctx.animeIds].slice(0, 40) },
            },
            select: { userId: true },
          })
        : [];
    const animeCounts = new Map<string, number>();
    for (const r of animeRows) {
      animeCounts.set(r.userId, (animeCounts.get(r.userId) ?? 0) + 1);
    }
    const myTags = new Set(ctx.favoriteTags.map((t) => t.toLowerCase()));
    for (const p of profiles) {
      const shared = p.favoriteTags.filter((t) => myTags.has(t.toLowerCase()));
      const anime = animeCounts.get(p.userId) ?? 0;
      if (shared.length === 0 && anime === 0) continue;
      out.set(p.userId, {
        score: clamp(shared.length * 22 + anime * 10),
        label: shared.length > 0 ? shared.slice(0, 2).join(" · ") : undefined,
        meta: { sharedTags: shared },
      });
    }
    return out;
  },
};

/** 4. 커뮤니티 */
export const communitySignal: SignalProvider = {
  id: "community",
  weight: 1.1,
  async suggestCandidates(ctx, limit) {
    if (ctx.communityIds.size === 0) return [];
    const rows = await db.communityMember.findMany({
      where: { communityId: { in: [...ctx.communityIds] } },
      select: { userId: true },
      take: limit * 4,
    });
    return [...new Set(rows.map((r) => r.userId).filter((id) => id !== ctx.userId))].slice(
      0,
      limit
    );
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!ctx.communityIds.size || !candidateIds.length) return out;
    const rows = await db.communityMember.findMany({
      where: {
        userId: { in: candidateIds },
        communityId: { in: [...ctx.communityIds] },
      },
      select: { userId: true, communityId: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.userId, (counts.get(r.userId) ?? 0) + 1);
    }
    // 같은 이벤트 참여
    const myEvents = await db.eventParticipant.findMany({
      where: { userId: ctx.userId },
      select: { eventId: true },
      take: 40,
    });
    const eventIds = myEvents.map((e) => e.eventId);
    let eventBoost = new Map<string, number>();
    if (eventIds.length) {
      const ep = await db.eventParticipant.findMany({
        where: { eventId: { in: eventIds }, userId: { in: candidateIds } },
        select: { userId: true },
      });
      eventBoost = new Map();
      for (const r of ep) {
        eventBoost.set(r.userId, (eventBoost.get(r.userId) ?? 0) + 1);
      }
    }
    for (const id of candidateIds) {
      const c = counts.get(id) ?? 0;
      const e = eventBoost.get(id) ?? 0;
      if (c === 0 && e === 0) continue;
      out.set(id, { score: clamp(c * 20 + e * 12) });
    }
    return out;
  },
};

/** 5. 태그 (최근 게시글 태그 겹침) */
export const tagSignal: SignalProvider = {
  id: "tag",
  weight: 0.9,
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const myPosts = await db.post.findMany({
      where: { authorId: ctx.userId },
      select: { tags: { select: { tagId: true } } },
      take: 40,
      orderBy: { createdAt: "desc" },
    });
    const myTagIds = new Set(myPosts.flatMap((p) => p.tags.map((t) => t.tagId)));
    if (myTagIds.size === 0 && ctx.favoriteTags.length === 0) return out;

    const theirPosts = await db.post.findMany({
      where: { authorId: { in: candidateIds } },
      select: {
        authorId: true,
        tags: { select: { tagId: true, tag: { select: { name: true } } } },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });
    const overlap = new Map<string, number>();
    const labelMap = new Map<string, string>();
    for (const p of theirPosts) {
      let hit = 0;
      for (const t of p.tags) {
        if (myTagIds.has(t.tagId)) {
          hit += 1;
          if (!labelMap.has(p.authorId)) labelMap.set(p.authorId, t.tag.name);
        }
      }
      if (hit) overlap.set(p.authorId, (overlap.get(p.authorId) ?? 0) + hit);
    }
    for (const [id, n] of overlap) {
      out.set(id, { score: clamp(n * 8), label: labelMap.get(id) });
    }
    return out;
  },
};

/** 6. 활동량 */
export const activitySignal: SignalProvider = {
  id: "activity",
  weight: 0.7,
  async scoreBatch(_ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [posts, comments, likes, lives] = await Promise.all([
      db.post.groupBy({
        by: ["authorId"],
        where: { authorId: { in: candidateIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      db.comment.groupBy({
        by: ["authorId"],
        where: { authorId: { in: candidateIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      db.like.groupBy({
        by: ["userId"],
        where: { userId: { in: candidateIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      db.voiceChannel.groupBy({
        by: ["createdBy"],
        where: { createdBy: { in: candidateIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const map = new Map<string, number>();
    for (const r of posts) map.set(r.authorId, (map.get(r.authorId) ?? 0) + r._count._all * 4);
    for (const r of comments) map.set(r.authorId, (map.get(r.authorId) ?? 0) + r._count._all);
    for (const r of likes) map.set(r.userId, (map.get(r.userId) ?? 0) + Math.min(r._count._all, 40) * 0.3);
    for (const r of lives) {
      map.set(r.createdBy, (map.get(r.createdBy) ?? 0) + r._count._all * 8);
    }
    for (const [id, raw] of map) {
      out.set(id, { score: clamp(raw) });
    }
    return out;
  },
};

/** 7. 프로필 방문 */
export const profileVisitSignal: SignalProvider = {
  id: "profile_visit",
  weight: 1.3,
  async suggestCandidates(ctx, limit) {
    const rows = await db.profileVisit.findMany({
      where: { visitorId: ctx.userId },
      orderBy: { lastVisitedAt: "desc" },
      take: limit,
      select: { profileUserId: true },
    });
    return rows.map((r) => r.profileUserId);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const rows = await db.profileVisit.findMany({
      where: { visitorId: ctx.userId, profileUserId: { in: candidateIds } },
      select: { profileUserId: true, visitCount: true },
    });
    for (const r of rows) {
      out.set(r.profileUserId, { score: clamp(Math.log2(r.visitCount + 1) * 28) });
    }
    return out;
  },
};

/** 8. 상호작용 */
export const interactionSignal: SignalProvider = {
  id: "interaction",
  weight: 1.25,
  async suggestCandidates(ctx, limit) {
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const likes = await db.like.findMany({
      where: { userId: ctx.userId, createdAt: { gte: since } },
      select: { post: { select: { authorId: true } } },
      take: 80,
      orderBy: { createdAt: "desc" },
    });
    const ids = new Set(likes.map((l) => l.post.authorId).filter((id) => id !== ctx.userId));
    return [...ids].slice(0, limit);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [likes, comments, reposts, dms] = await Promise.all([
      db.like.findMany({
        where: {
          userId: ctx.userId,
          createdAt: { gte: since },
          post: { authorId: { in: candidateIds } },
        },
        select: { post: { select: { authorId: true } } },
        take: 200,
      }),
      db.comment.findMany({
        where: {
          authorId: ctx.userId,
          createdAt: { gte: since },
          post: { authorId: { in: candidateIds } },
        },
        select: { post: { select: { authorId: true } } },
        take: 100,
      }),
      db.repost.findMany({
        where: {
          userId: ctx.userId,
          createdAt: { gte: since },
          post: { authorId: { in: candidateIds } },
        },
        select: { post: { select: { authorId: true } } },
        take: 80,
      }),
      db.message.findMany({
        where: {
          senderId: ctx.userId,
          createdAt: { gte: since },
          room: {
            type: "DM",
            members: { some: { userId: { in: candidateIds } } },
          },
        },
        select: {
          room: { select: { members: { select: { userId: true }, where: { userId: { in: candidateIds } } } } },
        },
        take: 50,
      }).catch(() => [] as { room: { members: { userId: string }[] } }[]),
    ]);
    const scores = new Map<string, number>();
    const bump = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);
    for (const r of likes) bump(r.post.authorId, 6);
    for (const r of comments) bump(r.post.authorId, 10);
    for (const r of reposts) bump(r.post.authorId, 8);
    for (const r of dms) {
      for (const m of r.room.members) bump(m.userId, 14);
    }
    for (const [id, s] of scores) out.set(id, { score: clamp(s) });
    return out;
  },
};

/** 9. 언어 */
export const localeSignal: SignalProvider = {
  id: "locale",
  weight: 0.55,
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const users = await db.user.findMany({
      where: { id: { in: candidateIds }, locale: ctx.locale },
      select: { id: true },
    });
    for (const u of users) out.set(u.id, { score: 55 });
    return out;
  },
};

/** 10. 국가 */
export const geoSignal: SignalProvider = {
  id: "geo",
  weight: 0.5,
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const users = await db.user.findMany({
      where: { id: { in: candidateIds }, countryCode: ctx.countryCode },
      select: { id: true },
    });
    for (const u of users) out.set(u.id, { score: 50 });
    // Discovery city overlap
    const myDisc = await db.discoveryProfile.findUnique({
      where: { userId: ctx.userId },
      select: { city: true },
    });
    if (myDisc?.city) {
      const sameCity = await db.discoveryProfile.findMany({
        where: { userId: { in: candidateIds }, city: myDisc.city },
        select: { userId: true },
      });
      for (const r of sameCity) {
        const prev = out.get(r.userId)?.score ?? 0;
        out.set(r.userId, { score: clamp(prev + 30) });
      }
    }
    return out;
  },
};

/** 11. 신규 사용자용 부스트 (인기/인증/스태프) */
export const newUserBoostSignal: SignalProvider = {
  id: "new_user_boost",
  weight: 1.0,
  async suggestCandidates(ctx, limit) {
    if (!ctx.isNewUser) return [];
    const staff = await db.user.findMany({
      where: isEligibleCandidateWhere({
        role: { in: ["VERIFIED", "ADMIN", "MODERATOR", "SENIOR_MODERATOR", "OWNER", "SUPER_ADMIN"] },
      }),
      select: { id: true },
      take: Math.ceil(limit / 2),
      orderBy: { createdAt: "asc" },
    });
    const popular = await db.user.findMany({
      where: isEligibleCandidateWhere(),
      select: { id: true },
      take: limit,
      orderBy: { followers: { _count: "desc" } },
    });
    return [...new Set([...staff, ...popular].map((u) => u.id))].slice(0, limit);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    if (!ctx.isNewUser || !candidateIds.length) return out;
    const users = await db.user.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        role: true,
        _count: { select: { followers: true } },
      },
    });
    for (const u of users) {
      let s = 0;
      if (u.role === "VERIFIED") s += 40;
      if (
        ["ADMIN", "MODERATOR", "SENIOR_MODERATOR", "OWNER", "SUPER_ADMIN"].includes(u.role)
      ) {
        s += 50;
      }
      s += Math.min(40, Math.log10(u._count.followers + 1) * 18);
      if (s > 0) out.set(u.id, { score: clamp(s) });
    }
    return out;
  },
};

/** 12. 인기 + 성장률 */
export const popularitySignal: SignalProvider = {
  id: "popularity",
  weight: 0.85,
  async suggestCandidates(_ctx, limit) {
    const rows = await db.user.findMany({
      where: isEligibleCandidateWhere(),
      select: { id: true },
      take: limit,
      orderBy: { followers: { _count: "desc" } },
    });
    return rows.map((r) => r.id);
  },
  async scoreBatch(_ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const users = await db.user.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        _count: { select: { followers: true, posts: true } },
      },
    });
    for (const u of users) {
      out.set(u.id, {
        score: clamp(Math.log10(u._count.followers + 1) * 28 + Math.log10(u._count.posts + 1) * 10),
      });
    }
    return out;
  },
};

export const growthSignal: SignalProvider = {
  id: "growth",
  weight: 0.9,
  async scoreBatch(_ctx, candidateIds) {
    const out = emptyBatch();
    if (!candidateIds.length) return out;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    const dateKeys = [formatDateKey(today), formatDateKey(weekAgo)];
    const snaps = await db.userGrowthSnapshot.findMany({
      where: { userId: { in: candidateIds }, dateKey: { in: dateKeys } },
      select: {
        userId: true,
        dateKey: true,
        followerCount: true,
        likeReceivedCount: true,
        postViewCount: true,
      },
    });
    const byUser = new Map<string, typeof snaps>();
    for (const s of snaps) {
      const arr = byUser.get(s.userId) ?? [];
      arr.push(s);
      byUser.set(s.userId, arr);
    }
    const todayKey = formatDateKey(today);
    const weekKey = formatDateKey(weekAgo);
    for (const [id, arr] of byUser) {
      const cur = arr.find((a) => a.dateKey === todayKey) ?? arr[0];
      const prev = arr.find((a) => a.dateKey === weekKey);
      if (!cur || !prev) continue;
      const dFollow = cur.followerCount - prev.followerCount;
      const dLike = cur.likeReceivedCount - prev.likeReceivedCount;
      const dView = cur.postViewCount - prev.postViewCount;
      const score = clamp(dFollow * 4 + Math.log10(Math.max(0, dLike) + 1) * 12 + Math.log10(Math.max(0, dView) + 1) * 8);
      if (score > 0) out.set(id, { score });
    }
    return out;
  },
};

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 검색 이력 기반 */
export const searchSignal: SignalProvider = {
  id: "search",
  weight: 0.75,
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    const logs = await db.searchLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { normalizedQuery: true, clickedType: true, clickedId: true },
    });
    if (!logs.length || !candidateIds.length) return out;
    const queries = [...new Set(logs.map((l) => l.normalizedQuery).filter(Boolean))].slice(0, 15);
    if (!queries.length) return out;
    const users = await db.user.findMany({
      where: {
        id: { in: candidateIds },
        OR: [
          { username: { in: queries, mode: "insensitive" } },
          { name: { in: queries, mode: "insensitive" } },
          { profile: { favoriteTags: { hasSome: queries } } },
        ],
      },
      select: { id: true },
    });
    for (const u of users) out.set(u.id, { score: 45 });
    for (const l of logs) {
      if (l.clickedType === "user" && l.clickedId && candidateIds.includes(l.clickedId)) {
        out.set(l.clickedId, { score: 70 });
      }
    }
    return out;
  },
};

export const postViewSignal: SignalProvider = {
  id: "post_view",
  weight: 1.0,
  async suggestCandidates(ctx, limit) {
    const rows = await db.postViewEvent.findMany({
      where: { userId: ctx.userId },
      orderBy: { lastViewedAt: "desc" },
      take: limit * 2,
      select: { authorId: true },
    });
    return [...new Set(rows.map((r) => r.authorId))].slice(0, limit);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    const rows = await db.postViewEvent.findMany({
      where: { userId: ctx.userId, authorId: { in: candidateIds } },
      select: { authorId: true, viewCount: true },
    });
    for (const r of rows) {
      out.set(r.authorId, { score: clamp(Math.log2(r.viewCount + 1) * 22) });
    }
    return out;
  },
};

export const videoWatchSignal: SignalProvider = {
  id: "video_watch",
  weight: 1.05,
  async suggestCandidates(ctx, limit) {
    const rows = await db.videoWatchEvent.findMany({
      where: { userId: ctx.userId },
      orderBy: { lastWatchedAt: "desc" },
      take: limit,
      select: { authorId: true },
    });
    return rows.map((r) => r.authorId);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    const rows = await db.videoWatchEvent.findMany({
      where: { userId: ctx.userId, authorId: { in: candidateIds } },
      select: { authorId: true, watchSeconds: true, watchCount: true },
    });
    for (const r of rows) {
      out.set(r.authorId, {
        score: clamp(Math.log2(r.watchCount + 1) * 18 + Math.min(40, r.watchSeconds / 30)),
      });
    }
    return out;
  },
};

export const liveWatchSignal: SignalProvider = {
  id: "live_watch",
  weight: 1.1,
  async suggestCandidates(ctx, limit) {
    const rows = await db.liveWatchEvent.findMany({
      where: { userId: ctx.userId },
      orderBy: { lastWatchedAt: "desc" },
      take: limit,
      select: { hostUserId: true },
    });
    return rows.map((r) => r.hostUserId);
  },
  async scoreBatch(ctx, candidateIds) {
    const out = emptyBatch();
    const rows = await db.liveWatchEvent.findMany({
      where: { userId: ctx.userId, hostUserId: { in: candidateIds } },
      select: { hostUserId: true, watchSeconds: true, sessionCount: true },
    });
    for (const r of rows) {
      out.set(r.hostUserId, {
        score: clamp(r.sessionCount * 12 + Math.min(50, r.watchSeconds / 60)),
      });
    }
    return out;
  },
};

/** 등록된 모든 시그널 — 확장 시 여기만 추가 */
export const SIGNAL_PROVIDERS: SignalProvider[] = [
  commonFollowSignal,
  interestSignal,
  communitySignal,
  tagSignal,
  activitySignal,
  profileVisitSignal,
  interactionSignal,
  localeSignal,
  geoSignal,
  newUserBoostSignal,
  popularitySignal,
  growthSignal,
  searchSignal,
  postViewSignal,
  videoWatchSignal,
  liveWatchSignal,
];

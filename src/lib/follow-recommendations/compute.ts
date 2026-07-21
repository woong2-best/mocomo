import { db } from "@/lib/db";
import {
  NEW_USER_DAYS,
  REC_CACHE_TTL_MS,
  REC_LIST_LIMIT,
  REC_POOL_LIMIT,
  type ScoredCandidate,
  type SignalReason,
  type ViewerContext,
} from "@/lib/follow-recommendations/types";
import { getExcludedUserIds, filterEligibleCandidateIds, isEligibleCandidateWhere } from "@/lib/follow-recommendations/exclude";
import { SIGNAL_PROVIDERS } from "@/lib/follow-recommendations/signals";
import { diversifyRecommendations } from "@/lib/follow-recommendations/diversify";

async function buildViewerContext(userId: string): Promise<ViewerContext | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      locale: true,
      countryCode: true,
      createdAt: true,
      profile: { select: { favoriteTags: true } },
    },
  });
  if (!user) return null;

  const [following, followers, communities, animes] = await Promise.all([
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      take: 500,
    }),
    db.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
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
  ]);

  const ageMs = Date.now() - user.createdAt.getTime();
  return {
    userId,
    locale: user.locale || "ko",
    countryCode: user.countryCode || "KR",
    createdAt: user.createdAt,
    favoriteTags: user.profile?.favoriteTags ?? [],
    followingIds: new Set(following.map((f) => f.followingId)),
    followerIds: new Set(followers.map((f) => f.followerId)),
    communityIds: new Set(communities.map((c) => c.communityId)),
    animeIds: new Set(animes.map((a) => a.animeId)),
    isNewUser: ageMs < NEW_USER_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function buildCandidatePool(
  ctx: ViewerContext,
  excluded: Set<string>
): Promise<string[]> {
  const ids = new Set<string>();
  await Promise.all(
    SIGNAL_PROVIDERS.map(async (p) => {
      if (!p.suggestCandidates) return;
      try {
        const suggested = await p.suggestCandidates(ctx, 40);
        for (const id of suggested) {
          if (!excluded.has(id)) ids.add(id);
        }
      } catch (e) {
        console.error(`[follow-rec] suggest ${p.id}`, e);
      }
    })
  );

  // 풀이 작으면 인기 사용자로 보충
  if (ids.size < 40) {
    const popular = await db.user.findMany({
      where: isEligibleCandidateWhere({
        id: { notIn: [...excluded].slice(0, 5000) },
      }),
      select: { id: true },
      take: 60,
      orderBy: { followers: { _count: "desc" } },
    });
    for (const u of popular) {
      if (!excluded.has(u.id)) ids.add(u.id);
    }
  }

  const pool = await filterEligibleCandidateIds([...ids], excluded);
  return pool.slice(0, REC_POOL_LIMIT);
}

function mergeSharedMeta(
  reasons: SignalReason[],
  metaBySignal: Map<string, Record<string, unknown> | undefined>
): Pick<ScoredCandidate, "sharedLabel" | "sharedFollowCount" | "sharedTags"> {
  let sharedFollowCount = 0;
  let sharedTags: string[] = [];
  let sharedLabel: string | undefined;

  for (const r of reasons) {
    const meta = metaBySignal.get(r.signalId);
    if (meta?.commonFollowCount && typeof meta.commonFollowCount === "number") {
      sharedFollowCount = Math.max(sharedFollowCount, meta.commonFollowCount);
    }
    if (Array.isArray(meta?.sharedTags)) {
      sharedTags = [...new Set([...sharedTags, ...(meta.sharedTags as string[])])];
    }
    if (r.label && !sharedLabel) sharedLabel = r.label;
  }

  if (!sharedLabel) {
    if (sharedTags.length) sharedLabel = sharedTags.slice(0, 2).join(" · ");
    else if (sharedFollowCount > 0) sharedLabel = `공통 팔로우 ${sharedFollowCount}`;
  }

  return { sharedLabel, sharedFollowCount, sharedTags };
}

/** 사용자별 추천 점수 계산 후 FollowRecommendation 캐시에 저장 */
export async function computeFollowRecommendations(userId: string, limit = REC_LIST_LIMIT) {
  const ctx = await buildViewerContext(userId);
  if (!ctx) return [];

  const excluded = await getExcludedUserIds(userId);
  const pool = await buildCandidatePool(ctx, excluded);
  if (!pool.length) {
    await db.followRecommendation.deleteMany({ where: { userId } });
    return [];
  }

  const scoreMaps = await Promise.all(
    SIGNAL_PROVIDERS.map(async (provider) => {
      try {
        const batch = await provider.scoreBatch(ctx, pool);
        return { provider, batch };
      } catch (e) {
        console.error(`[follow-rec] score ${provider.id}`, e);
        return { provider, batch: new Map() as Awaited<ReturnType<typeof provider.scoreBatch>> };
      }
    })
  );

  const scored: ScoredCandidate[] = [];
  for (const candidateId of pool) {
    if (excluded.has(candidateId)) continue;
    const reasons: SignalReason[] = [];
    const metaBySignal = new Map<string, Record<string, unknown> | undefined>();
    let total = 0;
    for (const { provider, batch } of scoreMaps) {
      const hit = batch.get(candidateId);
      if (!hit || hit.score <= 0) continue;
      const weighted = hit.score * provider.weight;
      total += weighted;
      reasons.push({
        signalId: provider.id,
        score: weighted,
        label: hit.label,
      });
      metaBySignal.set(provider.id, hit.meta);
    }
    if (total <= 0) continue;
    const shared = mergeSharedMeta(reasons, metaBySignal);
    scored.push({
      candidateId,
      score: total,
      bucket: "MIXED",
      reasons,
      ...shared,
    });
  }

  const diversified = diversifyRecommendations(scored, limit);
  const expiresAt = new Date(Date.now() + REC_CACHE_TTL_MS);
  const now = new Date();

  await db.$transaction([
    db.followRecommendation.deleteMany({ where: { userId } }),
    db.followRecommendation.createMany({
      data: diversified.map((c, rank) => ({
        userId,
        candidateId: c.candidateId,
        score: c.score,
        bucket: c.bucket,
        reasons: {
          signals: c.reasons,
          sharedLabel: c.sharedLabel ?? null,
          sharedFollowCount: c.sharedFollowCount ?? 0,
          sharedTags: c.sharedTags ?? [],
        },
        rank: rank + 1,
        computedAt: now,
        expiresAt,
      })),
    }),
  ]);

  return diversified;
}

export async function getOrComputeFollowRecommendations(userId: string, limit = REC_LIST_LIMIT) {
  const cached = await db.followRecommendation.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      candidateId: true,
      score: true,
      bucket: true,
      reasons: true,
      rank: true,
    },
  });

  if (cached.length >= Math.min(3, limit)) {
    return cached;
  }

  await computeFollowRecommendations(userId, limit);
  return db.followRecommendation.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      candidateId: true,
      score: true,
      bucket: true,
      reasons: true,
      rank: true,
    },
  });
}

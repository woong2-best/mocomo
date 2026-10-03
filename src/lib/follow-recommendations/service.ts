import type { RecommendationBucket, RecommendationEventType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrComputeFollowRecommendations } from "@/lib/follow-recommendations/compute";
import { getExcludedUserIds } from "@/lib/follow-recommendations/exclude";
import { REC_LIST_LIMIT, type RecommendListItem } from "@/lib/follow-recommendations/types";
import { userDisplayName } from "@/lib/user-public-select";

type ReasonJson = { signalId?: string; score?: number; label?: string };
type ReasonsPayload = {
  signals?: ReasonJson[];
  sharedLabel?: string | null;
  sharedFollowCount?: number;
  sharedTags?: string[];
};

function parseSharedFromReasons(reasons: unknown): {
  sharedLabel: string | null;
  sharedFollowCount: number;
  sharedTags: string[];
} {
  if (reasons && typeof reasons === "object" && !Array.isArray(reasons)) {
    const payload = reasons as ReasonsPayload;
    if (
      payload.sharedLabel != null ||
      payload.sharedFollowCount != null ||
      payload.sharedTags
    ) {
      return {
        sharedLabel: payload.sharedLabel ?? null,
        sharedFollowCount: payload.sharedFollowCount ?? 0,
        sharedTags: Array.isArray(payload.sharedTags) ? payload.sharedTags : [],
      };
    }
  }

  const list = Array.isArray(reasons)
    ? (reasons as ReasonJson[])
    : Array.isArray((reasons as ReasonsPayload)?.signals)
      ? ((reasons as ReasonsPayload).signals as ReasonJson[])
      : [];
  let sharedLabel: string | null = null;
  let sharedFollowCount = 0;
  const sharedTags: string[] = [];
  for (const r of list) {
    if (r.label && !sharedLabel) sharedLabel = r.label;
    if (r.signalId === "common_follow" && typeof r.score === "number") {
      sharedFollowCount = Math.max(sharedFollowCount, Math.round(r.score / 18));
    }
    if (r.signalId === "interest" && r.label) {
      for (const t of r.label.split("·").map((s) => s.trim()).filter(Boolean)) {
        sharedTags.push(t);
      }
    }
  }
  return { sharedLabel, sharedFollowCount, sharedTags };
}

/** API/UI용 추천 목록 */
export async function listFollowRecommendationsForUser(
  userId: string,
  limit = REC_LIST_LIMIT
): Promise<RecommendListItem[]> {
  const [excluded, pendingRequests, rows] = await Promise.all([
    getExcludedUserIds(userId),
    db.followRequest.findMany({
      where: { requesterId: userId },
      select: { targetId: true },
    }),
    getOrComputeFollowRecommendations(userId, limit),
  ]);
  for (const request of pendingRequests) excluded.add(request.targetId);
  let visibleRows = rows.filter((row) => !excluded.has(row.candidateId));
  if (visibleRows.length < rows.length) {
    const staleIds = rows
      .filter((row) => excluded.has(row.candidateId))
      .map((row) => row.candidateId);
    if (staleIds.length) {
      await db.followRecommendation
        .deleteMany({ where: { userId, candidateId: { in: staleIds } } })
        .catch(() => {});
    }
    if (visibleRows.length < Math.min(3, limit)) {
      const refreshed = await getOrComputeFollowRecommendations(userId, limit);
      visibleRows = refreshed.filter((row) => !excluded.has(row.candidateId));
    }
  }
  if (!visibleRows.length) return [];

  const ids = visibleRows.map((r) => r.candidateId);
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      supportTierSent: true,
      postsLocked: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const items: RecommendListItem[] = [];
  for (const row of visibleRows) {
    const u = byId.get(row.candidateId);
    if (!u) continue;
    const shared = parseSharedFromReasons(row.reasons);
    items.push({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
      supportTierSent: u.supportTierSent,
      score: row.score,
      bucket: row.bucket,
      sharedLabel: shared.sharedLabel,
      sharedFollowCount: shared.sharedFollowCount,
      sharedTags: shared.sharedTags,
      viewerFollows: false,
      postsLocked: u.postsLocked,
    });
  }
  return items;
}

export async function recordRecommendationEvent(opts: {
  userId: string;
  candidateId: string;
  eventType: RecommendationEventType;
  source?: string;
  score?: number | null;
  bucket?: RecommendationBucket | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.recommendationEvent.create({
    data: {
      userId: opts.userId,
      candidateId: opts.candidateId,
      eventType: opts.eventType,
      source: opts.source ?? "profile_sidebar",
      score: opts.score ?? null,
      bucket: opts.bucket ?? null,
      metadata: opts.metadata ?? undefined,
    },
  });
}

/** 팔로우 직후 캐시에서 해당 후보 제거 + 전환 이벤트 */
export async function onFollowFromRecommendation(
  userId: string,
  candidateId: string,
  source = "profile_sidebar"
) {
  await Promise.all([
    recordRecommendationEvent({
      userId,
      candidateId,
      eventType: "FOLLOW",
      source,
    }),
    db.followRecommendation.deleteMany({
      where: { userId, candidateId },
    }),
  ]);
}

export function displayNameForRec(item: Pick<RecommendListItem, "name" | "username">) {
  return userDisplayName(item);
}

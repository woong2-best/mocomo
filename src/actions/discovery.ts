"use server";

import { revalidatePath } from "next/cache";
import type { DiscoveryGender, DiscoveryLookingFor, DiscoverySwipeAction } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuthMinimal } from "@/lib/auth";
import { usedAgeFromBirthDate } from "@/lib/used-youth-protection";
import {
  filterAndRankCandidates,
  orderedPair,
  ageFromBirth,
} from "@/lib/discovery/matching";
import { DISCOVERY_MIN_AGE } from "@/lib/discovery/constants";
import type { DiscoveryCard, DiscoveryMatchRow, DiscoverySettings } from "@/lib/discovery/types";
import {
  notifyDiscoveryCheer,
  notifyDiscoveryLike,
  notifyDiscoveryMatch,
} from "@/lib/notifications";
import { getOrCreateDiscoveryDM } from "@/actions/discovery-chat";

const candidateSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  birthDate: true,
  isBanned: true,
  profile: {
    select: {
      bio: true,
      favoriteTags: true,
      mainCharacter: true,
      snsLinks: true,
    },
  },
  cosplayerProfile: {
    select: {
      bio: true,
      photos: { take: 3, orderBy: { createdAt: "desc" as const }, select: { url: true, character: true, series: true } },
      animes: { take: 4, select: { character: true, anime: { select: { title: true } } } },
    },
  },
  discoveryProfile: true,
  animeFollows: { select: { animeId: true } },
} as const;

async function ensureDiscoveryProfile(userId: string) {
  return db.discoveryProfile.upsert({
    where: { userId },
    create: { userId, enabled: false },
    update: { lastActiveAt: new Date() },
  });
}

function toSettings(
  dp: Awaited<ReturnType<typeof ensureDiscoveryProfile>>,
  hasBirthDate: boolean
): DiscoverySettings {
  return {
    enabled: dp.enabled,
    gender: dp.gender,
    showGender: dp.showGender,
    showAge: dp.showAge,
    city: dp.city,
    lat: dp.lat,
    lng: dp.lng,
    maxDistanceKm: dp.maxDistanceKm,
    minAge: dp.minAge,
    maxAge: dp.maxAge,
    lookingFor: dp.lookingFor,
    preferredGenders: dp.preferredGenders,
    pitch: dp.pitch,
    hasBirthDate,
  };
}

export async function getDiscoverySettings(): Promise<DiscoverySettings | { error: string }> {
  const user = await requireAuthMinimal();
  const [dp, u] = await Promise.all([
    ensureDiscoveryProfile(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { birthDate: true } }),
  ]);
  return toSettings(dp, !!u?.birthDate);
}

export async function updateDiscoverySettings(data: {
  enabled?: boolean;
  gender?: DiscoveryGender;
  showGender?: boolean;
  showAge?: boolean;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  maxDistanceKm?: number;
  minAge?: number;
  maxAge?: number;
  lookingFor?: DiscoveryLookingFor;
  preferredGenders?: DiscoveryGender[];
  pitch?: string;
}) {
  const user = await requireAuthMinimal();

  if (data.enabled) {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { birthDate: true, isBanned: true } });
    if (u?.isBanned) return { error: "이용이 제한된 계정입니다." };
    if (!u?.birthDate) {
      return { error: "매칭 참여 전 설정 → 프로필에서 생년월일을 등록해 주세요. (만 18세 이상)" };
    }
    const age = usedAgeFromBirthDate(u.birthDate);
    if (age < DISCOVERY_MIN_AGE) {
      return { error: `매칭은 만 ${DISCOVERY_MIN_AGE}세 이상만 이용할 수 있습니다.` };
    }
  }

  const minAge = Math.max(DISCOVERY_MIN_AGE, Math.min(99, data.minAge ?? 18));
  const maxAge = Math.max(minAge, Math.min(99, data.maxAge ?? 45));
  const maxDistanceKm = Math.max(5, Math.min(500, data.maxDistanceKm ?? 50));

  await db.discoveryProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      enabled: data.enabled ?? false,
      gender: data.gender ?? "UNSPECIFIED",
      showGender: data.showGender ?? true,
      showAge: data.showAge ?? false,
      city: data.city?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      maxDistanceKm,
      minAge,
      maxAge,
      lookingFor: data.lookingFor ?? "BOTH",
      preferredGenders: data.preferredGenders ?? [],
      pitch: data.pitch?.trim().slice(0, 280) || null,
      lastActiveAt: new Date(),
    },
    update: {
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      ...(data.gender !== undefined ? { gender: data.gender } : {}),
      ...(data.showGender !== undefined ? { showGender: data.showGender } : {}),
      ...(data.showAge !== undefined ? { showAge: data.showAge } : {}),
      ...(data.city !== undefined ? { city: data.city.trim() || null } : {}),
      ...(data.lat !== undefined ? { lat: data.lat } : {}),
      ...(data.lng !== undefined ? { lng: data.lng } : {}),
      maxDistanceKm,
      minAge,
      maxAge,
      ...(data.lookingFor !== undefined ? { lookingFor: data.lookingFor } : {}),
      ...(data.preferredGenders !== undefined ? { preferredGenders: data.preferredGenders } : {}),
      ...(data.pitch !== undefined ? { pitch: data.pitch.trim().slice(0, 280) || null } : {}),
      lastActiveAt: new Date(),
    },
  });

  revalidatePath("/discover");
  revalidatePath("/discover/settings");
  return { success: true };
}

export async function getDiscoveryDeck(): Promise<
  { cards: DiscoveryCard[]; enabled: true } | { enabled: false; reason: string }
> {
  const user = await requireAuthMinimal();
  const me = await db.discoveryProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: candidateSelect } },
  });

  if (!me?.enabled) {
    return { enabled: false, reason: "매칭 참여를 켜면 추천을 받을 수 있어요." };
  }

  const [swipes, blocks, myAnime] = await Promise.all([
    db.discoverySwipe.findMany({
      where: { fromUserId: user.id },
      select: { toUserId: true },
    }),
    db.discoveryBlock.findMany({
      where: {
        OR: [{ blockerId: user.id }, { blockedId: user.id }],
      },
      select: { blockerId: true, blockedId: true },
    }),
    db.animeFollow.findMany({ where: { userId: user.id }, select: { animeId: true } }),
  ]);

  const exclude = new Set<string>([user.id]);
  for (const s of swipes) exclude.add(s.toUserId);
  for (const b of blocks) {
    exclude.add(b.blockerId);
    exclude.add(b.blockedId);
  }

  const raw = await db.user.findMany({
    where: {
      id: { notIn: [...exclude] },
      isBanned: false,
      discoveryProfile: { is: { enabled: true } },
    },
    select: candidateSelect,
    take: 120,
    orderBy: { discoveryProfile: { lastActiveAt: "desc" } },
  });

  const myAnimeIds = new Set(myAnime.map((a) => a.animeId));
  const myTags = me.user.profile?.favoriteTags ?? [];
  const candidates = raw.filter((u): u is typeof u & { discoveryProfile: NonNullable<(typeof u)["discoveryProfile"]> } =>
    !!u.discoveryProfile?.enabled
  );
  const cards = filterAndRankCandidates(me, candidates, myAnimeIds, myTags);

  await db.discoveryProfile.update({
    where: { userId: user.id },
    data: { lastActiveAt: new Date() },
  });

  return { enabled: true, cards };
}

async function autoFollow(fromId: string, toId: string) {
  try {
    await db.follow.create({ data: { followerId: fromId, followingId: toId } });
  } catch {
    /* already following */
  }
}

async function tryCreateMatch(userId: string, targetId: string): Promise<boolean> {
  const reciprocal = await db.discoverySwipe.findFirst({
    where: {
      fromUserId: targetId,
      toUserId: userId,
      action: { in: ["LIKE", "CHEER"] },
    },
  });
  if (!reciprocal) return false;

  const [a, b] = orderedPair(userId, targetId);
  try {
    await db.discoveryMatch.create({
      data: { userAId: a, userBId: b },
    });
  } catch {
    return true;
  }

  void notifyDiscoveryMatch(targetId, userId);
  void notifyDiscoveryMatch(userId, targetId);
  await Promise.all([autoFollow(userId, targetId), autoFollow(targetId, userId)]);
  return true;
}

export async function discoverySwipe(
  targetUserId: string,
  action: DiscoverySwipeAction
): Promise<{ ok: true; matched?: boolean; following?: boolean } | { error: string }> {
  const user = await requireAuthMinimal();
  if (user.id === targetUserId) return { error: "자기 자신에게는 할 수 없습니다." };

  const me = await db.discoveryProfile.findUnique({ where: { userId: user.id } });
  if (!me?.enabled) return { error: "매칭 참여를 먼저 켜 주세요." };

  const target = await db.discoveryProfile.findUnique({ where: { userId: targetUserId } });
  if (!target?.enabled) return { error: "상대가 매칭에 참여하지 않습니다." };

  await db.discoverySwipe.upsert({
    where: { fromUserId_toUserId: { fromUserId: user.id, toUserId: targetUserId } },
    create: { fromUserId: user.id, toUserId: targetUserId, action },
    update: { action },
  });

  if (action === "PASS") return { ok: true };

  let matched = false;
  let following = false;

  if (action === "CHEER") {
    await autoFollow(user.id, targetUserId);
    following = true;
    void notifyDiscoveryCheer(targetUserId, user.id);
    matched = await tryCreateMatch(user.id, targetUserId);
  } else if (action === "LIKE") {
    void notifyDiscoveryLike(targetUserId, user.id);
    matched = await tryCreateMatch(user.id, targetUserId);
  }

  revalidatePath("/discover/matches");
  return { ok: true, matched, following };
}

export async function blockDiscoveryUser(targetUserId: string) {
  const user = await requireAuthMinimal();
  await db.discoveryBlock.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId } },
    create: { blockerId: user.id, blockedId: targetUserId },
    update: {},
  });
  await db.discoverySwipe.upsert({
    where: { fromUserId_toUserId: { fromUserId: user.id, toUserId: targetUserId } },
    create: { fromUserId: user.id, toUserId: targetUserId, action: "PASS" },
    update: { action: "PASS" },
  });
  return { ok: true };
}

export async function getDiscoveryMatches(): Promise<DiscoveryMatchRow[]> {
  const user = await requireAuthMinimal();
  const rows = await db.discoveryMatch.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: { matchedAt: "desc" },
    take: 50,
    include: {
      userA: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          profile: { select: { bio: true } },
          cosplayerProfile: {
            select: { photos: { take: 1, orderBy: { createdAt: "desc" }, select: { url: true } } },
          },
        },
      },
      userB: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          profile: { select: { bio: true } },
          cosplayerProfile: {
            select: { photos: { take: 1, orderBy: { createdAt: "desc" }, select: { url: true } } },
          },
        },
      },
    },
  });

  return rows.map((m) => {
    const other = m.userAId === user.id ? m.userB : m.userA;
    const unseen = m.userAId === user.id ? m.unseenByA : m.unseenByB;
    return {
      matchId: m.id,
      userId: other.id,
      username: other.username,
      name: other.name,
      image: other.image,
      bio: other.profile?.bio ?? null,
      matchedAt: m.matchedAt.toISOString(),
      isCosplayer: (other.cosplayerProfile?.photos.length ?? 0) > 0,
      cosplayPhoto: other.cosplayerProfile?.photos[0]?.url ?? null,
      unseen,
    };
  });
}

export async function markDiscoveryMatchesSeen() {
  const user = await requireAuthMinimal();
  await db.discoveryMatch.updateMany({
    where: { userAId: user.id, unseenByA: true },
    data: { unseenByA: false },
  });
  await db.discoveryMatch.updateMany({
    where: { userBId: user.id, unseenByB: true },
    data: { unseenByB: false },
  });
  return { ok: true };
}

export async function openDiscoveryChat(otherUserId: string) {
  const user = await requireAuthMinimal();
  const [a, b] = orderedPair(user.id, otherUserId);
  const match = await db.discoveryMatch.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (!match) return { error: "매칭된 상대에게만 메시지를 보낼 수 있습니다." };
  return getOrCreateDiscoveryDM(otherUserId);
}

export async function getDiscoveryMatchCount(): Promise<number> {
  const user = await requireAuthMinimal();
  return db.discoveryMatch.count({
    where: {
      OR: [
        { userAId: user.id, unseenByA: true },
        { userBId: user.id, unseenByB: true },
      ],
    },
  });
}

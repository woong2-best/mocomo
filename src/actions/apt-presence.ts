"use server";

import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { resolveHomeIdentity } from "@/lib/apt/home-identity";
import { DEFAULT_CHIBI_AVATAR } from "@/lib/apt/bondee/types";
import {
  deriveHomeActivity,
  formatAgoLabel,
  parseBondeeFromSim,
  type AptCommunityFeed,
  type AptPresenceOccupant,
} from "@/lib/apt/presence-types";
import type { AptNeighborLink } from "@/lib/apt/apt-daily-loop";
import { buildAptDailyLoop, startOfWeek } from "@/lib/apt/apt-daily-loop";

export type {
  HomeActivityState,
  AptPresenceOccupant,
  AptCommunityFeed,
  AptCommunityRankEntry,
  AptRecentVisitorEntry,
  AptPlazaPerformer,
} from "@/lib/apt/presence-types";

const ONLINE_MS = 90_000;
const ELEVATOR_BUSY_MIN = 2;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** APT 페이지 heartbeat — 실시간 접속·위치 반영 */
export async function heartbeatAptPresence(payload: {
  countryCode: string;
  mode: string;
  homeFloor: number;
  visitingUserId?: string | null;
}) {
  const user = await getCachedCurrentUser();
  if (!user) return { ok: false as const };

  await db.aptPresence.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      countryCode: payload.countryCode.toUpperCase(),
      mode: payload.mode,
      homeFloor: payload.homeFloor,
      visitingUserId: payload.visitingUserId ?? null,
      lastSeenAt: new Date(),
    },
    update: {
      countryCode: payload.countryCode.toUpperCase(),
      mode: payload.mode,
      homeFloor: payload.homeFloor,
      visitingUserId: payload.visitingUserId ?? null,
      lastSeenAt: new Date(),
    },
  });

  return { ok: true as const };
}

/** 이웃 집 입장 시 방문 기록 */
export async function recordAptHomeVisit(hostUserId: string) {
  const user = await getCachedCurrentUser();
  if (!user || user.id === hostUserId) return { ok: false as const, newBadges: [] as string[] };

  const beforeMade = await db.aptHomeVisit.count({ where: { visitorId: user.id } });
  const beforeHost = await db.aptHomeVisit.count({ where: { hostId: user.id } });

  await db.aptHomeVisit.create({
    data: { hostId: hostUserId, visitorId: user.id },
  });

  const { computeVisitBadges } = await import("@/lib/apt/apt-daily-loop");
  const afterMade = beforeMade + 1;
  const beforeBadges = new Set(computeVisitBadges(beforeMade, beforeHost).map((b) => b.id));
  const afterBadges = computeVisitBadges(afterMade, beforeHost);
  const newBadges = afterBadges.filter((b) => !beforeBadges.has(b.id)).map((b) => b.label);

  revalidatePath("/apt");
  return { ok: true as const, newBadges };
}

/** 국가별 실제 APT 커뮤니티 피드 — NPC·해시 연출 없음 */
export async function getCountryAptCommunityFeed(countryCode: string): Promise<AptCommunityFeed> {
  const user = await getCachedCurrentUser();
  const cc = countryCode.toUpperCase();
  const now = Date.now();
  const onlineSince = new Date(now - ONLINE_MS);
  const todayStart = startOfToday();

  const profiles = await db.aptProfile.findMany({
    where: {
      moveInCompletedAt: { not: null },
      housingType: "apartment",
      countryCode: cc,
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
  });

  const hostIds = profiles.map((p) => p.userId);

  const [presences, visitsToday, recentVisitsToMe, liveChannels] = await Promise.all([
    db.aptPresence.findMany({
      where: { countryCode: cc, lastSeenAt: { gte: onlineSince } },
    }),
    hostIds.length
      ? db.aptHomeVisit.findMany({
          where: { createdAt: { gte: todayStart }, hostId: { in: hostIds } },
          select: { hostId: true, visitorId: true },
        })
      : Promise.resolve([]),
    user
      ? db.aptHomeVisit.findMany({
          where: { hostId: user.id },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            visitor: { select: { id: true, name: true, username: true } },
          },
        })
      : Promise.resolve([]),
    db.voiceChannel.findMany({
      where: { isLive: true, liveStatus: "LIVE" },
      select: { createdBy: true },
    }),
  ]);

  const presenceByUser = new Map(presences.map((p) => [p.userId, p]));
  const streamingUserIds = new Set(liveChannels.map((c) => c.createdBy));

  const guestCountByHost = new Map<string, number>();
  for (const p of presences) {
    if (!p.visitingUserId) continue;
    guestCountByHost.set(p.visitingUserId, (guestCountByHost.get(p.visitingUserId) ?? 0) + 1);
  }

  const visitorCountToday = new Map<string, number>();
  const visitCountToday = new Map<string, number>();
  for (const v of visitsToday) {
    visitorCountToday.set(v.hostId, (visitorCountToday.get(v.hostId) ?? 0) + 1);
    visitCountToday.set(v.visitorId, (visitCountToday.get(v.visitorId) ?? 0) + 1);
  }

  const occupants: AptPresenceOccupant[] = profiles.map((row) => {
    const bondee = parseBondeeFromSim(row.simulationState);
    const plans =
      row.floorPlans && typeof row.floorPlans === "object"
        ? (row.floorPlans as Record<number, import("@/lib/apt/floor-plan-types").AptRoom[]>)
        : { [row.homeFloor]: createDefaultFloorPlan().rooms };
    const rooms = getRoomsForFloor(plans, row.homeFloor);
    const identity = resolveHomeIdentity(bondee, rooms);
    const presence = presenceByUser.get(row.userId);
    const isOnline = !!presence;
    const streaming = streamingUserIds.has(row.userId);
    const guestCount = guestCountByHost.get(row.userId) ?? 0;

    return {
      userId: row.user.id,
      username: row.user.username,
      displayName: row.user.name ?? row.user.username,
      homeFloor: row.homeFloor,
      doorOpen: row.homePublic ?? true,
      avatar: bondee.avatar ?? DEFAULT_CHIBI_AVATAR,
      activity: deriveHomeActivity(bondee, row.homePublic ?? true, streaming, guestCount),
      isOnline,
      aptMode: presence?.mode ?? null,
      visitingUserId: presence?.visitingUserId ?? null,
      visitorCountToday: visitorCountToday.get(row.userId) ?? 0,
      visitCountToday: visitCountToday.get(row.userId) ?? 0,
      identity,
    };
  });

  const visitorRanking = [...occupants]
    .filter((o) => o.visitorCountToday > 0)
    .sort((a, b) => b.visitorCountToday - a.visitorCountToday)
    .slice(0, 5)
    .map((o) => ({
      userId: o.userId,
      displayName: o.displayName,
      homeFloor: o.homeFloor,
      score: o.visitorCountToday,
    }));

  const activityRanking = [...occupants]
    .map((o) => ({
      userId: o.userId,
      displayName: o.displayName,
      homeFloor: o.homeFloor,
      score:
        o.visitCountToday * 2 +
        o.visitorCountToday +
        (o.isOnline ? 3 : 0) +
        (o.activity.streaming ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const popularHome = activityRanking[0]?.score ? activityRanking[0] : visitorRanking[0] ?? null;
  const mostVisitedToday = visitorRanking[0] ?? null;

  const floorOnline = new Map<number, number>();
  for (const p of presences) {
    const occ = occupants.find((o) => o.userId === p.userId);
    const floor = occ?.homeFloor ?? p.homeFloor;
    floorOnline.set(floor, (floorOnline.get(floor) ?? 0) + 1);
  }
  let mostActiveFloor: { floor: number; onlineCount: number } | null = null;
  for (const [floor, onlineCount] of floorOnline) {
    if (!mostActiveFloor || onlineCount > mostActiveFloor.onlineCount) {
      mostActiveFloor = { floor, onlineCount };
    }
  }

  const plazaPerformers = occupants
    .filter((o) => o.isOnline && (o.activity.streaming || o.activity.musicPlaying))
    .slice(0, 4)
    .map((o) => ({
      userId: o.userId,
      displayName: o.displayName,
      homeFloor: o.homeFloor,
      avatar: o.avatar,
      kind: o.activity.streaming ? ("stream" as const) : ("music" as const),
    }));

  const recentVisitorsToHome = recentVisitsToMe.map((v) => ({
    userId: v.visitor.id,
    displayName: v.visitor.name ?? v.visitor.username,
    agoLabel: formatAgoLabel(v.createdAt, now),
  }));

  const elevatorUsers = presences.filter((p) => p.mode === "elevator" || p.mode === "lobby").length;

  const weekStart = startOfWeek();
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  const [
    likesTodayRows,
    likesWeekRows,
    visitsWeekRows,
    myVisitsMade,
    myHostVisits,
    myHomesVisitedGroup,
    favorites,
    follows,
    frequentVisits,
    myLikes,
  ] = await Promise.all([
    hostIds.length
      ? db.aptHomeLike.groupBy({
          by: ["hostId"],
          where: { hostId: { in: hostIds }, createdAt: { gte: todayStart } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    hostIds.length
      ? db.aptHomeLike.groupBy({
          by: ["hostId"],
          where: { hostId: { in: hostIds }, createdAt: { gte: weekStart } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    hostIds.length
      ? db.aptHomeVisit.groupBy({
          by: ["hostId"],
          where: { hostId: { in: hostIds }, createdAt: { gte: weekStart } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    user ? db.aptHomeVisit.count({ where: { visitorId: user.id } }) : Promise.resolve(0),
    user ? db.aptHomeVisit.count({ where: { hostId: user.id } }) : Promise.resolve(0),
    user
      ? db.aptHomeVisit.groupBy({ by: ["hostId"], where: { visitorId: user.id } })
      : Promise.resolve([]),
    user
      ? db.aptFavoriteHome.findMany({
          where: { userId: user.id },
          include: {
            host: {
              select: {
                id: true,
                name: true,
                username: true,
                aptProfile: { select: { homeFloor: true, homePublic: true, housingType: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    user
      ? db.follow.findMany({
          where: { followerId: user.id },
          include: {
            following: {
              select: {
                id: true,
                name: true,
                username: true,
                aptProfile: { select: { homeFloor: true, homePublic: true, moveInCompletedAt: true, housingType: true, countryCode: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
    user
      ? db.aptHomeVisit
          .groupBy({
            by: ["hostId"],
            where: { visitorId: user.id },
            _count: { _all: true },
          })
          .then((rows) => rows.sort((a, b) => b._count._all - a._count._all).slice(0, 6))
      : Promise.resolve([]),
    user
      ? db.aptHomeLike.findMany({ where: { likerId: user.id }, select: { hostId: true } })
      : Promise.resolve([]),
  ]);

  const likesToday = new Map(likesTodayRows.map((r) => [r.hostId, r._count._all]));
  const likesWeek = new Map(likesWeekRows.map((r) => [r.hostId, r._count._all]));
  const visitsWeek = new Map(visitsWeekRows.map((r) => [r.hostId, r._count._all]));

  const occupantByUser = new Map(occupants.map((o) => [o.userId, o]));

  const mapNeighbor = (
    userId: string,
    displayName: string,
    username: string,
    homeFloor: number,
    relation: AptNeighborLink["relation"],
    doorOpen?: boolean,
    visitCount?: number
  ): AptNeighborLink => ({
    userId,
    displayName,
    username,
    homeFloor,
    relation,
    doorOpen,
    visitCount,
  });

  const favoriteHomes: AptNeighborLink[] = favorites
    .filter((f) => f.host.aptProfile?.housingType === "apartment")
    .map((f) =>
      mapNeighbor(
        f.host.id,
        f.host.name ?? f.host.username,
        f.host.username,
        f.host.aptProfile?.homeFloor ?? 50,
        "favorite",
        f.host.aptProfile?.homePublic ?? false
      )
    );

  const followedNeighbors: AptNeighborLink[] = follows
    .filter(
      (f) =>
        f.following.aptProfile?.moveInCompletedAt &&
        f.following.aptProfile.housingType === "apartment" &&
        f.following.aptProfile.countryCode === cc
    )
    .map((f) =>
      mapNeighbor(
        f.following.id,
        f.following.name ?? f.following.username,
        f.following.username,
        f.following.aptProfile!.homeFloor,
        "follow",
        f.following.aptProfile!.homePublic ?? false
      )
    );

  const frequentHomes: AptNeighborLink[] = frequentVisits
    .map((v) => {
      const occ = occupantByUser.get(v.hostId);
      const prof = profileByUser.get(v.hostId);
      if (!occ && !prof) return null;
      return mapNeighbor(
        v.hostId,
        occ?.displayName ?? "입주민",
        occ?.username ?? "",
        occ?.homeFloor ?? prof?.homeFloor ?? 50,
        "frequent",
        occ?.doorOpen ?? prof?.homePublic ?? false,
        v._count._all
      );
    })
    .filter((x): x is AptNeighborLink => x != null);

  const daily = buildAptDailyLoop({
    occupants,
    likesToday,
    likesWeek,
    visitsWeek,
    visitorRanking,
    plazaPerformers,
    myVisitsMade,
    myHomesVisited: myHomesVisitedGroup.length,
    myHostVisits,
    favoriteHomes,
    followedNeighbors,
    frequentHomes,
    likedHostIds: myLikes.map((l) => l.hostId),
    favoritedHostIds: favorites.map((f) => f.hostId),
  });

  return {
    occupants,
    recentVisitorsToHome,
    guestbookNames: recentVisitorsToHome.map((v) => v.displayName),
    popularHome,
    visitorRanking,
    mostVisitedToday,
    mostActiveFloor,
    plazaPerformers,
    elevatorBusy: elevatorUsers >= ELEVATOR_BUSY_MIN,
    mailboxUnread: recentVisitorsToHome.length,
    daily,
  };
}

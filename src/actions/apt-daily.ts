"use server";

import { revalidatePath } from "next/cache";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AptVisitBadge } from "@/lib/apt/apt-daily-loop";
import { computeVisitBadges } from "@/lib/apt/apt-daily-loop";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 집 좋아요 토글 — 오늘의 집·주간 베스트 집계 */
export async function toggleAptHomeLike(hostUserId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  if (user.id === hostUserId) return { ok: false as const, error: "본인 집에는 좋아요할 수 없습니다." };

  const existing = await db.aptHomeLike.findUnique({
    where: { hostId_likerId: { hostId: hostUserId, likerId: user.id } },
  });

  if (existing) {
    await db.aptHomeLike.delete({ where: { id: existing.id } });
    revalidatePath("/apt");
    return { ok: true as const, liked: false };
  }

  await db.aptHomeLike.create({ data: { hostId: hostUserId, likerId: user.id } });
  revalidatePath("/apt");
  return { ok: true as const, liked: true };
}

/** 즐겨찾는 집 / 이웃 추가·제거 */
export async function toggleAptFavoriteHome(hostUserId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  if (user.id === hostUserId) return { ok: false as const, error: "본인 집은 즐겨찾기할 수 없습니다." };

  const existing = await db.aptFavoriteHome.findUnique({
    where: { userId_hostId: { userId: user.id, hostId: hostUserId } },
  });

  if (existing) {
    await db.aptFavoriteHome.delete({ where: { id: existing.id } });
    revalidatePath("/apt");
    return { ok: true as const, favorited: false };
  }

  await db.aptFavoriteHome.create({ data: { userId: user.id, hostId: hostUserId } });
  revalidatePath("/apt");
  return { ok: true as const, favorited: true };
}

/** 내 방문 통계·배지 */
export async function getMyAptVisitStats(): Promise<{
  visitsMade: number;
  homesVisited: number;
  hostVisits: number;
  badges: AptVisitBadge[];
} | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const [visitsMade, hostVisits, homesVisited] = await Promise.all([
    db.aptHomeVisit.count({ where: { visitorId: user.id } }),
    db.aptHomeVisit.count({ where: { hostId: user.id } }),
    db.aptHomeVisit.groupBy({
      by: ["hostId"],
      where: { visitorId: user.id },
    }).then((g) => g.length),
  ]);

  return {
    visitsMade,
    homesVisited,
    hostVisits,
    badges: computeVisitBadges(visitsMade, hostVisits),
  };
}

/** 방문 후 새로 얻은 배지 */
export async function checkNewVisitBadges(beforeVisitsMade: number, beforeHostVisits: number) {
  const stats = await getMyAptVisitStats();
  if (!stats) return { newBadges: [] as AptVisitBadge[] };

  const before = computeVisitBadges(beforeVisitsMade, beforeHostVisits);
  const beforeIds = new Set(before.map((b) => b.id));
  return { newBadges: stats.badges.filter((b) => !beforeIds.has(b.id)) };
}

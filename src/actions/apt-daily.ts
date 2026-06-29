"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AptVisitBadge } from "@/lib/apt/apt-daily-loop";
import { computeVisitBadges } from "@/lib/apt/apt-daily-loop";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** �?좋아???��? ???�늘??집·주�?베스??집계 */
export async function toggleAptHomeLike(hostUserId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { ok: false as const, error: "로그?�이 ?�요?�니??" };
  if (user.id === hostUserId) return { ok: false as const, error: "본인 집에??좋아?�할 ???�습?�다." };

  const existing = await db.aptHomeLike.findUnique({
    where: { hostId_likerId: { hostId: hostUserId, likerId: user.id } },
  });

  if (existing) {
    await db.aptHomeLike.delete({ where: { id: existing.id } });
    revalidateAptHub();
    return { ok: true as const, liked: false };
  }

  await db.aptHomeLike.create({ data: { hostId: hostUserId, likerId: user.id } });
  revalidateAptHub();
  return { ok: true as const, liked: true };
}

/** 즐겨찾는 �?/ ?�웃 추�?·?�거 */
export async function toggleAptFavoriteHome(hostUserId: string) {
  const user = await getCachedCurrentUser();
  if (!user) return { ok: false as const, error: "로그?�이 ?�요?�니??" };
  if (user.id === hostUserId) return { ok: false as const, error: "본인 집�? 즐겨찾기?????�습?�다." };

  const existing = await db.aptFavoriteHome.findUnique({
    where: { userId_hostId: { userId: user.id, hostId: hostUserId } },
  });

  if (existing) {
    await db.aptFavoriteHome.delete({ where: { id: existing.id } });
    revalidateAptHub();
    return { ok: true as const, favorited: false };
  }

  await db.aptFavoriteHome.create({ data: { userId: user.id, hostId: hostUserId } });
  revalidateAptHub();
  return { ok: true as const, favorited: true };
}

/** ??방문 ?�계·배�? */
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

/** 방문 ???�로 ?��? 배�? */
export async function checkNewVisitBadges(beforeVisitsMade: number, beforeHostVisits: number) {
  const stats = await getMyAptVisitStats();
  if (!stats) return { newBadges: [] as AptVisitBadge[] };

  const before = computeVisitBadges(beforeVisitsMade, beforeHostVisits);
  const beforeIds = new Set(before.map((b) => b.id));
  return { newBadges: stats.badges.filter((b) => !beforeIds.has(b.id)) };
}

"use server";

import { cookies } from "next/headers";
import type { WebtoonPublishDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createHumanChallenge, verifyHumanChallengeAnswer } from "@/lib/human-challenge";
import {
  WEBTOON_ACCESS_COOKIE,
  WEBTOON_ACCESS_HOURS,
  WEBTOON_WEEK_DAYS,
} from "@/lib/webtoon/constants";

export async function issueWebtoonHumanChallenge() {
  return createHumanChallenge();
}

export async function verifyWebtoonHumanAccess(token: string, answer: string) {
  const check = verifyHumanChallengeAnswer(token, answer);
  if (!check.ok) return { error: check.error };

  const until = Date.now() + WEBTOON_ACCESS_HOURS * 60 * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set(WEBTOON_ACCESS_COOKIE, String(until), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: WEBTOON_ACCESS_HOURS * 60 * 60,
    path: "/webtoon",
  });
  return { success: true as const };
}

export async function hasWebtoonAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(WEBTOON_ACCESS_COOKIE)?.value;
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now();
}

export async function listWebtoonWeeklyGrid() {
  const series = await db.creatorSeries.findMany({
    where: { kind: "WEBTOON", publishDay: { not: null } },
    orderBy: [{ publishDay: "asc" }, { updatedAt: "desc" }],
    include: {
      author: { select: { username: true, name: true } },
      episodes: {
        where: { published: true },
        orderBy: { episodeNo: "desc" },
        take: 1,
        select: { id: true, episodeNo: true, price: true, createdAt: true },
      },
    },
  });

  const byDay = WEBTOON_WEEK_DAYS.reduce(
    (acc, d) => {
      acc[d] = [];
      return acc;
    },
    {} as Record<WebtoonPublishDay, typeof series>
  );

  for (const s of series) {
    if (s.publishDay) byDay[s.publishDay].push(s);
  }
  return byDay;
}

export async function getProfileWebtoons(authorId: string, viewerId: string | null) {
  const series = await db.creatorSeries.findMany({
    where: { authorId, kind: "WEBTOON" },
    orderBy: { updatedAt: "desc" },
    include: {
      episodes: {
        where: { published: true },
        orderBy: { episodeNo: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          episodeNo: true,
          price: true,
        },
      },
    },
  });

  if (!viewerId) {
    return series.map((s) => ({
      ...s,
      episodes: s.episodes.map((e) => ({ ...e, owned: e.price <= 0 })),
    }));
  }

  const episodeIds = series.flatMap((s) => s.episodes.map((e) => e.id));
  const purchases =
    episodeIds.length > 0
      ? await db.creatorEpisodePurchase.findMany({
          where: { buyerId: viewerId, episodeId: { in: episodeIds } },
          select: { episodeId: true },
        })
      : [];
  const ownedSet = new Set(purchases.map((p) => p.episodeId));
  const isAuthor = viewerId === authorId;

  return series.map((s) => ({
    ...s,
    episodes: s.episodes.map((e) => ({
      ...e,
      owned: isAuthor || e.price <= 0 || ownedSet.has(e.id),
    })),
  }));
}

export async function updateWebtoonPublishDay(seriesId: string, publishDay: WebtoonPublishDay) {
  const user = await requireAuth();
  const series = await db.creatorSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.authorId !== user.id || series.kind !== "WEBTOON") {
    return { error: "웹툰 시리즈를 찾을 수 없습니다." };
  }
  await db.creatorSeries.update({
    where: { id: seriesId },
    data: { publishDay, updatedAt: new Date() },
  });
  revalidatePath("/webtoon");
  revalidatePath("/webtoon/studio");
  return { success: true as const };
}

export async function createWebtoonSeries(input: {
  title: string;
  description?: string;
  coverUrl: string;
  publishDay: WebtoonPublishDay;
}) {
  const user = await requireAuth();
  if (!input.title.trim()) return { error: "제목을 입력해 주세요." };
  if (!input.coverUrl.trim()) return { error: "표지가 필요합니다." };

  const series = await db.creatorSeries.create({
    data: {
      authorId: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      coverUrl: input.coverUrl.trim(),
      kind: "WEBTOON",
      publishDay: input.publishDay,
    },
  });
  revalidatePath("/webtoon");
  revalidatePath("/webtoon/studio");
  return { series };
}

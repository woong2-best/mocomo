"use server";

import { cookies } from "next/headers";
import type { WebtoonGenre, WebtoonPublishDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createHumanChallenge, verifyHumanChallengeAnswer } from "@/lib/human-challenge";
import {
  WEBTOON_ACCESS_COOKIE,
  WEBTOON_ACCESS_HOURS,
  WEBTOON_WEEK_DAYS,
  type IllustrationMarketSort,
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

export async function listWebtoonWeeklyGrid(genre?: WebtoonGenre | null) {
  const series = await db.creatorSeries.findMany({
    where: {
      kind: "WEBTOON",
      publishDay: { not: null },
      ...(genre ? { genre } : {}),
    },
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

function parseEpisodeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

function episodeThumbnail(input: {
  previewUrls: unknown;
  contentUrls: unknown;
  series: { coverUrl: string };
}): string {
  const preview = parseEpisodeUrls(input.previewUrls);
  const content = parseEpisodeUrls(input.contentUrls);
  return preview[0] ?? content[0] ?? input.series.coverUrl;
}

export type IllustrationMarketItem = {
  id: string;
  title: string;
  price: number;
  viewCount: number;
  salesCount: number;
  thumbnailUrl: string;
  publishedAt: Date | null;
  author: { username: string | null; name: string | null; image: string | null };
  series: { id: string; title: string; genre: WebtoonGenre | null };
};

/** 픽시브 스타일 — 개별 일러스트 작품 피드 */
export async function listIllustrationMarketFeed(opts: {
  genre?: WebtoonGenre | null;
  sort?: IllustrationMarketSort;
  take?: number;
}): Promise<IllustrationMarketItem[]> {
  const sort = opts.sort ?? "latest";
  const rows = await db.creatorEpisode.findMany({
    where: {
      published: true,
      series: {
        kind: "WEBTOON",
        ...(opts.genre ? { genre: opts.genre } : {}),
      },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    orderBy:
      sort === "popular"
        ? [{ salesCount: "desc" }, { viewCount: "desc" }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: opts.take ?? 72,
    include: {
      author: { select: { username: true, name: true, image: true } },
      series: { select: { id: true, title: true, coverUrl: true, genre: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    price: row.price,
    viewCount: row.viewCount,
    salesCount: row.salesCount,
    thumbnailUrl: episodeThumbnail(row),
    publishedAt: row.publishedAt,
    author: row.author,
    series: { id: row.series.id, title: row.series.title, genre: row.series.genre },
  }));
}

export type ProfileIllustrationItem = {
  id: string;
  title: string;
  price: number;
  thumbnailUrl: string;
  owned: boolean;
  seriesTitle: string;
};

export async function getProfileIllustrations(authorId: string, viewerId: string | null) {
  const rows = await db.creatorEpisode.findMany({
    where: {
      authorId,
      published: true,
      series: { kind: "WEBTOON" },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 24,
    include: {
      series: { select: { title: true, coverUrl: true } },
    },
  });

  if (rows.length === 0) return [];

  const purchases =
    viewerId && viewerId !== authorId
      ? await db.creatorEpisodePurchase.findMany({
          where: { buyerId: viewerId, episodeId: { in: rows.map((r) => r.id) } },
          select: { episodeId: true },
        })
      : [];
  const ownedSet = new Set(purchases.map((p) => p.episodeId));
  const isAuthor = viewerId === authorId;

  return rows.map((row): ProfileIllustrationItem => ({
    id: row.id,
    title: row.title,
    price: row.price,
    thumbnailUrl: episodeThumbnail({ ...row, series: row.series }),
    owned: isAuthor || row.price <= 0 || ownedSet.has(row.id),
    seriesTitle: row.series.title,
  }));
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

export async function updateWebtoonGenre(seriesId: string, genre: WebtoonGenre) {
  const user = await requireAuth();
  const series = await db.creatorSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.authorId !== user.id || series.kind !== "WEBTOON") {
    return { error: "웹툰 시리즈를 찾을 수 없습니다." };
  }
  await db.creatorSeries.update({
    where: { id: seriesId },
    data: { genre, updatedAt: new Date() },
  });
  revalidatePath("/webtoon");
  revalidatePath("/webtoon/studio");
  return { success: true as const };
}

export async function createWebtoonSeries(input: {
  title: string;
  description?: string;
  coverUrl: string;
  publishDay?: WebtoonPublishDay | null;
  genre: WebtoonGenre;
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
      publishDay: input.publishDay ?? null,
      genre: input.genre,
    },
  });
  revalidatePath("/webtoon");
  revalidatePath("/webtoon/studio");
  return { series };
}

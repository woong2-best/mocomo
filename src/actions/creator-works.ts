"use server";

import { revalidatePath } from "next/cache";
import type { CreatorWorkKind } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { splitPlatformFee } from "@/lib/settlement";
import { rewritePaidEpisodeVideoUrl } from "@/lib/paid-media-playback";

function parseUrlList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

export async function listCreatorSeries(kind?: CreatorWorkKind) {
  return db.creatorSeries.findMany({
    where: kind ? { kind } : {},
    orderBy: { updatedAt: "desc" },
    take: 48,
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      episodes: {
        where: { published: true },
        select: { id: true, episodeNo: true, price: true },
        orderBy: { episodeNo: "asc" },
      },
    },
  });
}

export async function getCreatorSeries(seriesId: string) {
  return db.creatorSeries.findUnique({
    where: { id: seriesId },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      episodes: {
        where: { published: true },
        orderBy: { episodeNo: "asc" },
        select: {
          id: true,
          title: true,
          episodeNo: true,
          price: true,
          previewUrls: true,
          salesCount: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getCreatorEpisode(episodeId: string) {
  return db.creatorEpisode.findUnique({
    where: { id: episodeId, published: true },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      series: {
        select: { id: true, title: true, kind: true, coverUrl: true },
      },
    },
  });
}

export async function userOwnsEpisode(userId: string, episodeId: string) {
  const episode = await db.creatorEpisode.findUnique({
    where: { id: episodeId },
    select: { authorId: true, price: true },
  });
  if (!episode) return false;
  if (episode.authorId === userId) return true;
  if (episode.price <= 0) return true;
  const purchase = await db.creatorEpisodePurchase.findUnique({
    where: { buyerId_episodeId: { buyerId: userId, episodeId } },
  });
  return !!purchase;
}

export async function getEpisodeAccess(userId: string | null, episodeId: string) {
  const episode = await db.creatorEpisode.findUnique({
    where: { id: episodeId, published: true },
    include: {
      author: { select: { id: true, username: true, name: true, image: true } },
      series: { select: { id: true, title: true, kind: true, coverUrl: true, genre: true } },
    },
  });
  if (!episode) return { error: "actions.sv7siz8" as const };
  const isAuthor = userId === episode.authorId;
  if (!isAuthor && episode.scheduledAt && episode.scheduledAt > new Date()) {
    return { error: "actions.s106x1tx" as const };
  }

  const owned = userId ? await userOwnsEpisode(userId, episodeId) : episode.price <= 0;
  const previewUrls = parseUrlList(episode.previewUrls);
  const contentUrls = parseUrlList(episode.contentUrls);
  const freeCount = Math.max(0, episode.freePreviewCount);

  let visibleUrls = previewUrls;
  if (episode.series.kind === "WEBTOON" || episode.series.kind === "PHOTO") {
    const pages = contentUrls.length > 0 ? contentUrls : previewUrls;
    visibleUrls = owned ? pages : pages.slice(0, freeCount);
  }

  return {
    episode,
    owned,
    visibleUrls,
    locked: !owned && episode.price > 0,
    videoUrl: rewritePaidEpisodeVideoUrl({
      episodeId: episode.id,
      videoUrl: owned ? episode.videoUrl : null,
      price: episode.price,
      locked: !owned && episode.price > 0,
    }),
    previewVideoBlocked: !owned && !!episode.videoUrl,
  };
}

export async function createCreatorSeries(input: {
  title: string;
  description?: string;
  coverUrl: string;
  kind: CreatorWorkKind;
}) {
  const user = await requireAuth();
  if (!input.title.trim()) return { error: "actions.sojdmy3" };
  if (!input.coverUrl.trim()) return { error: "actions.scuuh6h" };

  const series = await db.creatorSeries.create({
    data: {
      authorId: user.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      coverUrl: input.coverUrl.trim(),
      kind: input.kind,
    },
  });

  revalidatePath("/works");
  revalidatePath("/works/studio");
  return { series };
}

export async function publishCreatorEpisode(input: {
  seriesId: string;
  title: string;
  episodeNo: number;
  price: number;
  previewUrls?: string[];
  contentUrls?: string[];
  videoUrl?: string;
  freePreviewCount?: number;
  scheduledAt?: string | null;
}) {
  const user = await requireAuth();
  const series = await db.creatorSeries.findUnique({ where: { id: input.seriesId } });
  if (!series || series.authorId !== user.id) return { error: "actions.s1wo3hx9" };
  if (input.price < 0) return { error: "actions.s1y2yueo" };
  if (input.episodeNo < 1) return { error: "actions.stoe11l" };

  const previewUrls = input.previewUrls ?? [];
  const contentUrls = input.contentUrls ?? [];

  if (series.kind === "VIDEO") {
    if (!input.videoUrl?.trim()) return { error: "actions.url" };
  } else if (contentUrls.length === 0) {
    return { error: "actions.sapsw5x" };
  }

  const existing = await db.creatorEpisode.findUnique({
    where: { seriesId_episodeNo: { seriesId: input.seriesId, episodeNo: input.episodeNo } },
  });
  if (existing) return { error: "actions.sjl7cmc" };

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const isFuture = scheduledAt && scheduledAt > new Date();

  const episode = await db.creatorEpisode.create({
    data: {
      seriesId: input.seriesId,
      authorId: user.id,
      title: input.title.trim() || t("actions.s16c4", { v0: input.episodeNo }),
      episodeNo: input.episodeNo,
      price: input.price,
      previewUrls,
      contentUrls,
      videoUrl: input.videoUrl?.trim() || null,
      freePreviewCount: input.freePreviewCount ?? (series.kind === "WEBTOON" ? 1 : 0),
      scheduledAt,
      publishedAt: isFuture ? null : new Date(),
    },
  });

  await db.creatorSeries.update({
    where: { id: input.seriesId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/works/series/${input.seriesId}`);
  revalidatePath("/works");
  return { episode };
}

export async function listMyCreatorSeries() {
  const user = await requireAuth();
  return db.creatorSeries.findMany({
    where: { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      episodes: { orderBy: { episodeNo: "asc" }, select: { id: true, title: true, episodeNo: true, price: true } },
    },
  });
}

export async function fulfillCreatorEpisodePurchase(
  buyerId: string,
  episodeId: string,
  amount: number,
  paymentIntentId: string
) {
  const episode = await db.creatorEpisode.findUnique({
    where: { id: episodeId },
    include: { author: { select: { id: true } } },
  });
  if (!episode) return { error: "actions.s1mox0n5" };
  if (episode.price !== amount) return { error: "actions.s5c55hc" };
  if (episode.authorId === buyerId) return { error: "actions.s15qa9ak" };

  const existing = await db.creatorEpisodePurchase.findUnique({
    where: { buyerId_episodeId: { buyerId, episodeId } },
  });
  if (existing) return { success: true as const, alreadyOwned: true as const };

  await db.creatorEpisodePurchase.create({
    data: { buyerId, episodeId, price: amount },
  });
  await db.creatorEpisode.update({
    where: { id: episodeId },
    data: { salesCount: { increment: 1 } },
  });

  const { platformFee, sellerAmount } = splitPlatformFee(amount);
  return {
    success: true as const,
    authorId: episode.authorId,
    platformFee,
    sellerAmount,
    referenceId: episodeId,
    paymentIntentId,
  };
}

export async function getMyPurchasedEpisodes(userId: string) {
  const rows = await db.creatorEpisodePurchase.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      episode: {
        include: {
          series: { select: { id: true, title: true, kind: true, coverUrl: true, genre: true } },
        },
      },
    },
  });
  return rows.map((r) => r.episode);
}

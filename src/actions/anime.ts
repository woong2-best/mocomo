"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { z } from "zod";
import {
  animeUpdateSchema,
  createAnimeForUser,
  restoreAnimeRevisionForUser,
  updateAnimeForUser,
} from "@/lib/anime-create-for-user";
import { listAnimeHistory } from "@/lib/anime-history";

export async function createAnime(data: z.infer<typeof animeUpdateSchema>) {
  const user = await requireAuth();
  const parsed = animeUpdateSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const { editSummary: _editSummary, ...createPayload } = parsed.data;
  const result = await createAnimeForUser(user.id, createPayload);
  if ("error" in result) return result;
  const anime = await db.anime.findUnique({
    where: { slug: result.anime.slug },
    select: { id: true, slug: true, title: true },
  });
  if (!anime) return { error: "저장 후 문서를 불러오지 못했습니다." };
  return { anime };
}

export async function updateAnime(
  slug: string,
  data: z.infer<typeof animeUpdateSchema>
) {
  const user = await requireAuth();
  return updateAnimeForUser(user.id, slug, data);
}

const goodsSchema = z.object({
  animeId: z.string().min(1),
  title: z.string().min(1).max(200),
  type: z.string().min(1).max(80),
  price: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  linkUrl: z.string().url().optional().or(z.literal("")),
});

export async function addAnimeGoods(data: z.infer<typeof goodsSchema>) {
  await requireAuth();
  const parsed = goodsSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const { animeId, title, type, price, imageUrl, linkUrl } = parsed.data;
  const anime = await db.anime.findUnique({ where: { id: animeId }, select: { slug: true } });
  if (!anime) return { error: "애니를 찾을 수 없습니다." };

  const goods = await db.animeGoods.create({
    data: {
      animeId,
      title,
      type,
      price: price ?? null,
      imageUrl: imageUrl || null,
      linkUrl: linkUrl || null,
    },
  });

  revalidatePath(`/anime/${anime.slug}`);
  return { goods };
}

export async function deleteAnimeGoods(goodsId: string) {
  await requireAuth();
  const row = await db.animeGoods.findUnique({
    where: { id: goodsId },
    include: { anime: { select: { slug: true } } },
  });
  if (!row) return { error: "굿즈를 찾을 수 없습니다." };

  await db.animeGoods.delete({ where: { id: goodsId } });
  revalidatePath(`/anime/${row.anime.slug}`);
  return { ok: true };
}

export async function toggleAnimeFollow(animeId: string) {
  const user = await requireAuth();
  const existing = await db.animeFollow.findUnique({
    where: { userId_animeId: { userId: user.id, animeId } },
  });

  if (existing) {
    await db.animeFollow.delete({ where: { id: existing.id } });
    await db.anime.update({
      where: { id: animeId },
      data: { followerCount: { decrement: 1 } },
    });
    revalidatePath("/anime");
    return { following: false };
  }

  await db.animeFollow.create({ data: { userId: user.id, animeId } });
  await db.anime.update({
    where: { id: animeId },
    data: { followerCount: { increment: 1 } },
  });
  revalidatePath("/anime");
  return { following: true };
}

export async function toggleAnimeStar(animeId: string) {
  const user = await requireAuth();
  const { toggleAnimeStarForUser } = await import("@/lib/star-bookmarks");
  const result = await toggleAnimeStarForUser(user.id, animeId);
  if ("error" in result) return result;
  revalidatePath("/anime");
  revalidatePath("/star");
  return result;
}

export async function getAnimeCountByGenre() {
  const counts = await db.anime.groupBy({
    by: ["genre"],
    _count: { id: true },
  });
  return counts;
}

export async function getAnimeRevisions(slug: string) {
  return listAnimeHistory(slug);
}

export async function restoreAnimeRevision(revisionId: string) {
  const user = await requireAuth();
  return restoreAnimeRevisionForUser(user.id, revisionId);
}

export async function requestAnimeDeletion(slug: string, reason: string) {
  const user = await requireAuth();
  const text = reason.trim();
  if (text.length < 10) return { error: "삭제 사유를 10자 이상 입력해 주세요." };

  const anime = await db.anime.findUnique({ where: { slug }, select: { id: true } });
  if (!anime) return { error: "애니를 찾을 수 없습니다." };

  await db.animeDeleteRequest.create({
    data: { animeId: anime.id, requesterId: user.id, reason: text },
  });
  revalidatePath("/anime/delete-requests");
  return { ok: true };
}

export async function toggleAnimeProtection(slug: string, isProtected: boolean) {
  await requireAdmin();
  const anime = await db.anime.update({
    where: { slug },
    data: { isProtected },
  });
  revalidatePath(`/anime/${slug}`);
  revalidatePath(`/anime/${slug}/edit`);
  return { anime };
}

export async function getAnimeDeleteRequests() {
  await requireAdmin();
  return db.animeDeleteRequest.findMany({
    where: { status: "PENDING" },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      anime: { select: { slug: true, title: true } },
      requester: { select: { username: true } },
    },
  });
}

export async function resolveAnimeDeleteRequest(requestId: string, status: "APPROVED" | "REJECTED") {
  await requireAdmin();
  const req = await db.animeDeleteRequest.findUnique({
    where: { id: requestId },
    include: { anime: { select: { slug: true } } },
  });
  if (!req) return { error: "요청을 찾을 수 없습니다." };

  if (status === "APPROVED") {
    await db.anime.delete({ where: { id: req.animeId } });
    revalidatePath("/anime");
    revalidatePath(`/anime/${req.anime.slug}`);
  } else {
    await db.animeDeleteRequest.update({
      where: { id: requestId },
      data: { status },
    });
  }
  revalidatePath("/anime/delete-requests");
  return { ok: true };
}

export async function getUserWikiContributions(userId: string) {
  const [created, edited] = await Promise.all([
    db.anime.findMany({
      where: { creatorId: userId },
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, updatedAt: true },
    }),
    db.animeRevision.findMany({
      where: { editorId: userId },
      take: 20,
      orderBy: { createdAt: "desc" },
      distinct: ["animeId"],
      include: { anime: { select: { slug: true, title: true } } },
    }),
  ]);
  return { created, edited };
}

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isSiteOperator, requireAuth, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { AnimeGenre, UserRole, type Prisma } from "@prisma/client";
import { z } from "zod";
import { animeToSnapshot, type AnimeRevisionSnapshot } from "@/lib/anime-revision";

const animeSchema = z.object({
  title: z.string().min(1).max(200),
  titleEn: z.string().optional(),
  genre: z.nativeEnum(AnimeGenre),
  synopsis: z.string().optional(),
  studio: z.string().optional(),
  worldInfo: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  charactersText: z.string().optional(),
  tags: z.string().optional(),
  editSummary: z.string().max(200).optional(),
});

function parseCharacters(text?: string) {
  if (!text?.trim()) return undefined;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((name) => ({ name }));
}

function canEditProtected(user: { username: string; role: string; email?: string | null }) {
  return (
    isSiteOperator(user) ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.MODERATOR
  );
}

async function saveAnimeRevision(
  animeId: string,
  editorId: string,
  snapshot: AnimeRevisionSnapshot,
  summary?: string
) {
  try {
    await db.animeRevision.create({
      data: {
        animeId,
        editorId,
        snapshot: snapshot as Prisma.InputJsonValue,
        summary: summary || null,
      },
    });
  } catch (e) {
    console.error("[anime-revision]", e);
  }
}

function snapshotToUpdateData(snapshot: AnimeRevisionSnapshot) {
  return {
    title: snapshot.title,
    titleEn: snapshot.titleEn,
    genre: snapshot.genre as AnimeGenre,
    synopsis: snapshot.synopsis,
    studio: snapshot.studio,
    worldInfo: snapshot.worldInfo,
    coverUrl: snapshot.coverUrl,
    bannerUrl: snapshot.bannerUrl,
    characters: snapshot.characters ?? undefined,
    tags: snapshot.tags,
  };
}

export async function createAnime(data: z.infer<typeof animeSchema>) {
  const user = await requireAuth();
  const parsed = animeSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const { title, titleEn, genre, synopsis, studio, worldInfo, coverUrl, bannerUrl, charactersText, tags } =
    parsed.data;

  let slug = slugify(title);
  const exists = await db.anime.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const tagList = tags
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const anime = await db.anime.create({
    data: {
      title,
      titleEn: titleEn || null,
      slug,
      genre,
      synopsis: synopsis || null,
      studio: studio || null,
      worldInfo: worldInfo || null,
      coverUrl: coverUrl || null,
      bannerUrl: bannerUrl || null,
      characters: parseCharacters(charactersText),
      tags: tagList,
      creatorId: user.id,
    },
  });

  await saveAnimeRevision(anime.id, user.id, animeToSnapshot(anime), "최초 작성");

  revalidatePath("/anime");
  revalidatePath(`/anime/list/${genre.toLowerCase().replace(/_/g, "-")}`);
  return { anime };
}

export async function updateAnime(
  slug: string,
  data: z.infer<typeof animeSchema>
) {
  const user = await requireAuth();
  const parsed = animeSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const existing = await db.anime.findUnique({ where: { slug } });
  if (!existing) return { error: "애니를 찾을 수 없습니다." };
  if (existing.isProtected && !canEditProtected(user)) {
    return { error: "보호된 문서는 운영진만 편집할 수 있습니다." };
  }

  const { title, titleEn, genre, synopsis, studio, worldInfo, coverUrl, bannerUrl, charactersText, tags, editSummary } =
    parsed.data;

  await saveAnimeRevision(existing.id, user.id, animeToSnapshot(existing), editSummary);

  const tagList = tags
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) ?? [];

  const anime = await db.anime.update({
    where: { slug },
    data: {
      title,
      titleEn: titleEn || null,
      genre,
      synopsis: synopsis || null,
      studio: studio || null,
      worldInfo: worldInfo || null,
      coverUrl: coverUrl || null,
      bannerUrl: bannerUrl || null,
      characters: parseCharacters(charactersText),
      tags: tagList,
    },
  });

  revalidatePath("/anime");
  revalidatePath(`/anime/${slug}`);
  revalidatePath(`/anime/${slug}/history`);
  revalidatePath(`/anime/list/${genre.toLowerCase().replace(/_/g, "-")}`);
  return { anime };
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

export async function getAnimeCountByGenre() {
  const counts = await db.anime.groupBy({
    by: ["genre"],
    _count: { id: true },
  });
  return counts;
}

export async function getAnimeRevisions(slug: string) {
  const anime = await db.anime.findUnique({
    where: { slug },
    select: { id: true, title: true },
  });
  if (!anime) return { error: "애니를 찾을 수 없습니다." };

  const revisions = await db.animeRevision.findMany({
    where: { animeId: anime.id },
    take: 40,
    orderBy: { createdAt: "desc" },
    include: { editor: { select: { username: true, name: true } } },
  });
  return { anime, revisions };
}

export async function restoreAnimeRevision(revisionId: string) {
  const user = await requireAuth();
  const revision = await db.animeRevision.findUnique({
    where: { id: revisionId },
    include: { anime: true },
  });
  if (!revision) return { error: "수정 기록을 찾을 수 없습니다." };
  if (revision.anime.isProtected && !canEditProtected(user)) {
    return { error: "보호된 문서는 운영진만 복구할 수 있습니다." };
  }

  const snapshot = revision.snapshot as AnimeRevisionSnapshot;
  await saveAnimeRevision(revision.animeId, user.id, animeToSnapshot(revision.anime), `복구: ${revision.id.slice(0, 8)}`);

  const anime = await db.anime.update({
    where: { id: revision.animeId },
    data: snapshotToUpdateData(snapshot),
  });

  revalidatePath("/anime");
  revalidatePath(`/anime/${anime.slug}`);
  revalidatePath(`/anime/${anime.slug}/history`);
  return { anime };
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

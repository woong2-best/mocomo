"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { AnimeGenre } from "@prisma/client";
import { z } from "zod";

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
});

function parseCharacters(text?: string) {
  if (!text?.trim()) return undefined;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((name) => ({ name }));
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

  revalidatePath("/anime");
  revalidatePath(`/anime/list/${genre.toLowerCase().replace(/_/g, "-")}`);
  return { anime };
}

export async function updateAnime(
  slug: string,
  data: z.infer<typeof animeSchema>
) {
  await requireAuth();
  const parsed = animeSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const existing = await db.anime.findUnique({ where: { slug } });
  if (!existing) return { error: "애니를 찾을 수 없습니다." };

  const { title, titleEn, genre, synopsis, studio, worldInfo, coverUrl, bannerUrl, charactersText, tags } =
    parsed.data;

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

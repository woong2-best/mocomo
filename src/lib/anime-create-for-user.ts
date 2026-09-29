import { revalidatePath } from "next/cache";
import { AnimeGenre, UserRole, type Prisma } from "@prisma/client";
import { z } from "zod";
import { isSiteOperator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  animeToSnapshot,
  snapshotToUpdateData,
  type AnimeRevisionSnapshot,
} from "@/lib/anime-revision";
import { animeSlugFromTitle, isValidAnimeSlug } from "@/lib/utils";

const imageUrlSchema = z.string().max(2000).optional().or(z.literal(""));

export const animeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  titleEn: z.string().optional(),
  genre: z.nativeEnum(AnimeGenre),
  synopsis: z.string().optional(),
  studio: z.string().optional(),
  worldInfo: z.string().optional(),
  infobox: z.string().optional(),
  coverUrl: imageUrlSchema,
  bannerUrl: imageUrlSchema,
  charactersText: z.string().optional(),
  tags: z.string().optional(),
});

export const animeUpdateSchema = animeCreateSchema.extend({
  editSummary: z.string().max(200).optional(),
});

export type AnimeUpdateInput = z.infer<typeof animeUpdateSchema>;

export type AnimeCreateInput = z.infer<typeof animeCreateSchema>;

function parseCharacters(text?: string) {
  if (!text?.trim()) return undefined;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((name) => ({ name }));
}

async function saveAnimeRevision(
  animeId: string,
  editorId: string,
  snapshot: AnimeRevisionSnapshot,
  summary?: string
) {
  await db.animeRevision.create({
    data: {
      animeId,
      editorId,
      snapshot: snapshot as Prisma.InputJsonValue,
      summary: summary || null,
    },
  });
}

export async function createAnimeForUser(
  userId: string,
  data: AnimeCreateInput
): Promise<{ anime: { slug: string; title: string } } | { error: string }> {
  const parsed = animeCreateSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const {
    title,
    titleEn,
    genre,
    synopsis,
    studio,
    worldInfo,
    infobox,
    coverUrl,
    bannerUrl,
    charactersText,
    tags,
  } = parsed.data;

  let slug = animeSlugFromTitle(title, titleEn);
  if (!isValidAnimeSlug(slug)) {
    return { error: "글 주소(slug)를 만들 수 없습니다. 영문 부제를 입력해 주세요." };
  }
  const exists = await db.anime.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const tagList =
    tags
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
      infobox: infobox || null,
      coverUrl: coverUrl || null,
      bannerUrl: bannerUrl || null,
      characters: parseCharacters(charactersText),
      tags: tagList,
      creatorId: userId,
    },
  });

  await saveAnimeRevision(anime.id, userId, animeToSnapshot(anime), "최초 작성");

  revalidatePath("/anime");
  revalidatePath(`/anime/list/${genre.toLowerCase().replace(/_/g, "-")}`);

  return { anime: { slug: anime.slug, title: anime.title } };
}

function canEditProtected(user: { username: string; role: string; email?: string | null }) {
  return (
    isSiteOperator(user) ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.MODERATOR
  );
}

export async function updateAnimeForUser(
  userId: string,
  slug: string,
  data: AnimeUpdateInput
): Promise<{ anime: { slug: string; title: string } } | { error: string }> {
  const parsed = animeUpdateSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const [existing, user] = await Promise.all([
    db.anime.findUnique({ where: { slug } }),
    db.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true, email: true },
    }),
  ]);
  if (!existing) return { error: "문서를 찾을 수 없습니다." };
  if (!user) return { error: "로그인이 필요합니다." };
  if (existing.isProtected && !canEditProtected(user)) {
    return { error: "보호된 문서는 운영진만 편집할 수 있습니다." };
  }

  const {
    title,
    titleEn,
    genre,
    synopsis,
    studio,
    worldInfo,
    infobox,
    coverUrl,
    bannerUrl,
    charactersText,
    tags,
    editSummary,
  } = parsed.data;

  await saveAnimeRevision(existing.id, userId, animeToSnapshot(existing), editSummary);

  const tagList =
    tags
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
      infobox: infobox || null,
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
  return { anime: { slug: anime.slug, title: anime.title } };
}

export async function restoreAnimeRevisionForUser(
  userId: string,
  revisionId: string
): Promise<{ anime: { slug: string; title: string } } | { error: string }> {
  const [revision, user] = await Promise.all([
    db.animeRevision.findUnique({
      where: { id: revisionId },
      include: { anime: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { username: true, role: true, email: true },
    }),
  ]);
  if (!revision) return { error: "수정 기록을 찾을 수 없습니다." };
  if (!user) return { error: "로그인이 필요합니다." };
  if (revision.anime.isProtected && !canEditProtected(user)) {
    return { error: "보호된 문서는 운영진만 복구할 수 있습니다." };
  }

  const snapshot = revision.snapshot as AnimeRevisionSnapshot;
  await saveAnimeRevision(
    revision.animeId,
    userId,
    animeToSnapshot(revision.anime),
    `복구: ${revision.id.slice(0, 8)}`
  );

  const data = snapshotToUpdateData(snapshot);
  const anime = await db.anime.update({
    where: { id: revision.animeId },
    data: {
      ...data,
      genre: data.genre as AnimeGenre,
    },
  });

  revalidatePath("/anime");
  revalidatePath(`/anime/${anime.slug}`);
  revalidatePath(`/anime/${anime.slug}/history`);
  return { anime: { slug: anime.slug, title: anime.title } };
}

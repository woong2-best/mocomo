"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  characterMatchesAnime,
  resolveAnimeCharacterName,
  parseAnimeCharacters,
} from "@/lib/anime-characters";
import { z } from "zod";

const BIO_MAX = 300;

const applySchema = z.object({
  stageName: z.string().max(50).optional(),
  bio: z.string().min(1).max(BIO_MAX),
  photoUrl: z.string().url(),
  animeId: z.string().min(1),
  characterName: z.string().min(1).max(80),
});

export async function getCosplayerApplyContext() {
  const user = await requireAuth();
  const existing = await db.cosplayerProfile.findUnique({
    where: { userId: user.id },
    include: { photos: true, animeLinks: { include: { anime: { select: { title: true, slug: true } } } } },
  });

  const animes = await db.anime.findMany({
    select: { id: true, title: true, slug: true, characters: true },
    orderBy: { title: "asc" },
  });

  return {
    alreadyRegistered: !!existing,
    profile: existing,
    animes: animes.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      characters: parseAnimeCharacters(a.characters),
    })),
    username: user.username,
  };
}

export async function applyAsCosplayer(data: z.infer<typeof applySchema>) {
  const user = await requireAuth();
  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  const { stageName, bio, photoUrl, animeId, characterName } = parsed.data;

  const existing = await db.cosplayerProfile.findUnique({ where: { userId: user.id } });
  if (existing) return { error: "이미 코스어로 등록되어 있습니다." };

  const anime = await db.anime.findUnique({ where: { id: animeId } });
  if (!anime) return { error: "애니를 찾을 수 없습니다." };

  const matched = characterMatchesAnime(characterName, anime.characters);
  const officialName = resolveAnimeCharacterName(characterName, anime.characters) ?? characterName.trim();

  const profile = await db.cosplayerProfile.create({
    data: {
      userId: user.id,
      stageName: stageName?.trim() || user.name || user.username,
      bio: bio.trim(),
      photos: {
        create: {
          url: photoUrl,
          character: officialName,
          series: anime.title,
        },
      },
    },
  });

  let linked = false;
  if (matched) {
    await db.cosplayerAnime.create({
      data: {
        profileId: profile.id,
        animeId: anime.id,
        character: officialName,
      },
    });
    linked = true;
  }

  revalidatePath("/cosplay");
  revalidatePath(`/cosplay/${user.username}`);
  revalidatePath(`/u/${user.username}`);
  revalidatePath(`/anime/${anime.slug}`);

  return {
    success: true,
    linked,
    anime: { title: anime.title, slug: anime.slug },
    character: officialName,
  };
}

export async function updateCosplayerProfile(data: {
  stageName?: string;
  bio?: string;
  photoUrl?: string;
  animeId?: string;
  characterName?: string;
}) {
  const user = await requireAuth();
  const profile = await db.cosplayerProfile.findUnique({
    where: { userId: user.id },
    include: { photos: true, animeLinks: true },
  });
  if (!profile) return { error: "코스어 프로필이 없습니다. 먼저 신청해주세요." };

  if (data.bio && data.bio.length > BIO_MAX) {
    return { error: `자기소개는 ${BIO_MAX}자까지입니다.` };
  }

  await db.cosplayerProfile.update({
    where: { id: profile.id },
    data: {
      ...(data.stageName !== undefined && { stageName: data.stageName || null }),
      ...(data.bio !== undefined && { bio: data.bio }),
    },
  });

  if (data.photoUrl) {
    await db.cosplayPhoto.deleteMany({ where: { profileId: profile.id } });
    await db.cosplayPhoto.create({
      data: {
        profileId: profile.id,
        url: data.photoUrl,
        character: data.characterName ?? profile.photos[0]?.character,
        series: profile.photos[0]?.series,
      },
    });
  }

  let linked = false;
  if (data.animeId && data.characterName) {
    const anime = await db.anime.findUnique({ where: { id: data.animeId } });
    if (anime && characterMatchesAnime(data.characterName, anime.characters)) {
      const officialName = resolveAnimeCharacterName(data.characterName, anime.characters) ?? data.characterName.trim();
      await db.cosplayerAnime.upsert({
        where: { profileId_animeId: { profileId: profile.id, animeId: anime.id } },
        create: { profileId: profile.id, animeId: anime.id, character: officialName },
        update: { character: officialName },
      });
      if (profile.photos[0] || data.photoUrl) {
        const photo = await db.cosplayPhoto.findFirst({ where: { profileId: profile.id } });
        if (photo) {
          await db.cosplayPhoto.update({
            where: { id: photo.id },
            data: { character: officialName, series: anime.title },
          });
        }
      }
      linked = true;
      revalidatePath(`/anime/${anime.slug}`);
    }
  }

  revalidatePath("/cosplay");
  revalidatePath(`/cosplay/${user.username}`);
  return { success: true, linked };
}

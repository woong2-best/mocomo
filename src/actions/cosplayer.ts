"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  characterMatchesAnime,
  resolveAnimeCharacterName,
} from "@/lib/anime-characters";
import {
  applyAsCosplayerForUser,
  COSPLAYER_BIO_MAX,
} from "@/lib/cosplayer-apply";
import { z } from "zod";

const BIO_MAX = COSPLAYER_BIO_MAX;

function isPersistablePhotoUrl(url: string) {
  const u = url.trim();
  if (!u || u.startsWith("blob:") || u.startsWith("data:")) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

const applySchema = z.object({
  bio: z.string().min(1).max(BIO_MAX),
  photoUrl: z.string().min(1).refine(isPersistablePhotoUrl, { message: t("actions.s19yn70z") }),
});

export async function getCosplayerApplyContext() {
  const user = await requireAuth();
  const existing = await db.cosplayerProfile.findUnique({
    where: { userId: user.id },
    include: { photos: true, animeLinks: { include: { anime: { select: { title: true, slug: true } } } } },
  });

  return {
    alreadyRegistered: !!existing,
    profile: existing,
    username: user.username,
  };
}

export async function applyAsCosplayer(data: z.infer<typeof applySchema>) {
  const user = await requireAuth();
  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return { error: "actions.s161j9bt" };

  const result = await applyAsCosplayerForUser(user.id, parsed.data);
  if ("error" in result) return { error: result.error };
  return { success: true as const };
}

export async function updateCosplayerProfile(data: {
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
  if (!profile) return { error: "actions.s6tmd3u" };

  if (data.bio && data.bio.length > BIO_MAX) {
    return { error: t("actions.svebzp", { v0: BIO_MAX }) };
  }

  await db.cosplayerProfile.update({
    where: { id: profile.id },
    data: {
      ...(data.bio !== undefined && { bio: data.bio }),
    },
  });

  if (data.photoUrl) {
    if (!isPersistablePhotoUrl(data.photoUrl)) {
      return { error: "actions.s1mpyx3b" };
    }
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

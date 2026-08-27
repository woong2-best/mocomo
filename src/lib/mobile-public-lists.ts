/**
 * Short-TTL caches for public mobile list GETs (Twitter/IG-class tab opens).
 */
import { unstable_cache } from "next/cache";
import type { AnimeGenre, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export function getCachedMobileCommunities(take: number, q?: string) {
  const keyQ = q?.trim() || "";
  return unstable_cache(
    async () => {
      return db.community.findMany({
        where: {
          isPublic: true,
          ...(keyQ
            ? {
                OR: [
                  { name: { contains: keyQ, mode: "insensitive" } },
                  { slug: { contains: keyQ, mode: "insensitive" } },
                  { description: { contains: keyQ, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        take,
        orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          iconUrl: true,
          bannerUrl: true,
          coverUrl: true,
          category: true,
          isNsfw: true,
          memberCount: true,
          joinMode: true,
        },
      });
    },
    ["mobile-communities-v2", String(take), keyQ || "__all__"],
    { revalidate: 30 }
  )();
}

export function getCachedMobileAnimeList(opts: {
  take: number;
  q?: string;
  genre?: AnimeGenre | null;
}) {
  const keyQ = opts.q?.trim() || "";
  const keyG = opts.genre || "";
  return unstable_cache(
    async () => {
      const where: Prisma.AnimeWhereInput = {};
      if (opts.genre) where.genre = opts.genre;
      if (keyQ) {
        where.OR = [
          { title: { contains: keyQ, mode: "insensitive" } },
          { titleEn: { contains: keyQ, mode: "insensitive" } },
        ];
      }
      return db.anime.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: opts.genre
          ? [{ title: "asc" }]
          : [{ viewCount: "desc" }, { updatedAt: "desc" }],
        take: opts.take,
        select: {
          slug: true,
          title: true,
          titleEn: true,
          coverUrl: true,
          genre: true,
          viewCount: true,
        },
      });
    },
    ["mobile-anime-list-v1", String(opts.take), keyQ || "__all__", keyG || "__all__"],
    { revalidate: 60 }
  )();
}

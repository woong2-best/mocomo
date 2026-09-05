import { db } from "@/lib/db";
import { compactWorkKey } from "@/lib/used-catalog";

export type AnimeSuggestHit = {
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  workKey: string;
};

export async function suggestAnimeForCommerce(query: string, limit = 8): Promise<AnimeSuggestHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const compact = compactWorkKey(q);

  const rows = await db.anime.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
        ...(compact
          ? [{ title: { contains: compact, mode: "insensitive" as const } }]
          : []),
      ],
    },
    orderBy: [{ followerCount: "desc" }, { viewCount: "desc" }],
    take: Math.min(limit, 12),
    select: {
      slug: true,
      title: true,
      titleEn: true,
      coverUrl: true,
    },
  });

  return rows.map((a) => ({
    slug: a.slug,
    title: a.title,
    titleEn: a.titleEn,
    coverUrl: a.coverUrl,
    workKey: compactWorkKey(a.title) || a.slug,
  }));
}

export async function resolveAnimeSlugFromWorkTitle(
  workTitle: string | null | undefined
): Promise<string | null> {
  const key = compactWorkKey(workTitle);
  if (!key) return null;
  const hit = await db.anime.findFirst({
    where: {
      OR: [
        { slug: key.toLowerCase() },
        { title: { equals: workTitle?.trim(), mode: "insensitive" } },
      ],
    },
    select: { slug: true },
  });
  return hit?.slug ?? null;
}

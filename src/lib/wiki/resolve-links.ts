import { db } from "@/lib/db";
import { wikiLinkSlug } from "@/lib/anime-revision";

export type WikiLinkStatus = {
  exists: boolean;
  slug: string;
};

export type WikiLinkStatusMap = Record<string, WikiLinkStatus>;

function sameTitle(a: string | null | undefined, b: string): boolean {
  return Boolean(a && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export async function resolveWikiLinks(targets: string[]): Promise<WikiLinkStatusMap> {
  const unique = [...new Set(targets.map((t) => t.trim()).filter(Boolean))].slice(0, 80);
  const result: WikiLinkStatusMap = {};
  if (unique.length === 0) return result;

  const slugs = [...new Set(unique.map((title) => wikiLinkSlug(title)).filter(Boolean))];
  const found = await db.anime.findMany({
    where: {
      OR: [
        slugs.length ? { slug: { in: slugs } } : undefined,
        { title: { in: unique } },
        { titleEn: { in: unique } },
      ].filter(Boolean) as { slug?: { in: string[] }; title?: { in: string[] }; titleEn?: { in: string[] } }[],
    },
    select: { slug: true, title: true, titleEn: true },
  });

  for (const target of unique) {
    const slug = wikiLinkSlug(target);
    const hit =
      found.find((row) => row.slug === slug) ??
      found.find((row) => sameTitle(row.title, target) || sameTitle(row.titleEn, target));
    result[target] = {
      exists: Boolean(hit),
      slug: hit?.slug ?? slug,
    };
  }

  return result;
}

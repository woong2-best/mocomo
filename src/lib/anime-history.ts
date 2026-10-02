import { db } from "@/lib/db";

export type AnimeHistoryEntry = {
  id: string;
  username: string;
  createdAt: string;
  summary: string | null;
  restorable: boolean;
};

export async function listAnimeHistory(slug: string): Promise<
  | { error: string }
  | {
      anime: { title: string; slug: string };
      entries: AnimeHistoryEntry[];
    }
> {
  const anime = await db.anime.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      creator: { select: { username: true } },
    },
  });
  if (!anime) return { error: "Document not found." };

  const revisions = await db.animeRevision.findMany({
    where: { animeId: anime.id },
    orderBy: { createdAt: "asc" },
    include: { editor: { select: { username: true } } },
  });

  const entries: AnimeHistoryEntry[] = revisions.map((r) => ({
    id: r.id,
    username: r.editor.username,
    createdAt: r.createdAt.toISOString(),
    summary: r.summary,
    restorable: true,
  }));

  // "Initial draft" in Korean was stored by older revisions; keep recognising it.
  const hasInitial = entries.some((e) => e.summary === "Initial draft" || e.summary === "\uCD5C\uCD08 \uC791\uC131");
  if (!hasInitial) {
    entries.unshift({
      id: `created-${anime.id}`,
      username: anime.creator.username,
      createdAt: anime.createdAt.toISOString(),
      summary: "Initial draft",
      restorable: false,
    });
  }

  return { anime: { title: anime.title, slug: anime.slug }, entries };
}

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
  if (!anime) return { error: "문서를 찾을 수 없습니다." };

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

  const hasInitial = entries.some((e) => e.summary === "최초 작성");
  if (!hasInitial) {
    entries.unshift({
      id: `created-${anime.id}`,
      username: anime.creator.username,
      createdAt: anime.createdAt.toISOString(),
      summary: "최초 작성",
      restorable: false,
    });
  }

  return { anime: { title: anime.title, slug: anime.slug }, entries };
}

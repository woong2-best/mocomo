import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeRevisions } from "@/actions/anime";
import { AnimeHistoryClient } from "@/components/anime/anime-history-client";
import { Button } from "@/components/ui/button";

export default async function AnimeHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getAnimeRevisions(slug);
  if ("error" in data && data.error) notFound();

  const { anime, revisions } = data as Exclude<Awaited<ReturnType<typeof getAnimeRevisions>>, { error: string }>;

  return (
    <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">수정 기록</h1>
          <p className="text-sm text-muted-foreground">{anime.title}</p>
        </div>
        <Link href={`/anime/${slug}`}>
          <Button variant="outline" size="sm" className="rounded-lg">
            문서로
          </Button>
        </Link>
      </div>
      <AnimeHistoryClient slug={slug} revisions={revisions} />
    </div>
  );
}

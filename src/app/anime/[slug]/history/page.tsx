import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeRevisions } from "@/actions/anime";
import { AnimeHistoryClient } from "@/components/anime/anime-history-client";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { Button } from "@/components/ui/button";

export default async function AnimeHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getAnimeRevisions(slug);
  if ("error" in data && data.error) notFound();

  const { anime, revisions } = data as Exclude<Awaited<ReturnType<typeof getAnimeRevisions>>, { error: string }>;

  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <div className="flex items-center justify-between gap-2">
        <NativePageTitle>
          <div>
            <h1 className="text-xl font-bold">수정 기록</h1>
            <p className="text-sm text-muted-foreground">{anime.title}</p>
          </div>
        </NativePageTitle>
        <Link href={`/anime/${slug}`}>
          <Button variant="outline" size="sm" className="rounded-lg">
            문서로
          </Button>
        </Link>
      </div>
      <AnimeHistoryClient slug={slug} revisions={revisions} />
    </AppPageChrome>
  );
}

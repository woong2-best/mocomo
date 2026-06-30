import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEpisodeAccess } from "@/actions/creator-works";
import { isPaymentsConfigured } from "@/lib/payments";
import { EpisodeViewer } from "@/components/works/episode-viewer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorksEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  await searchParams;
  const session = await auth();
  const access = await getEpisodeAccess(session?.user?.id ?? null, id);
  if ("error" in access) notFound();

  const { episode, owned, visibleUrls, locked, videoUrl, previewVideoBlocked } = access;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="space-y-4">
      <Link href={`/works/series/${episode.series.id}`}>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          {episode.series.title}
        </Button>
      </Link>

      <header>
        <h1 className="text-lg font-bold">
          {episode.episodeNo}화 · {episode.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">@{episode.author.username}</p>
      </header>

      <EpisodeViewer
        kind={episode.series.kind}
        title={`${episode.series.title} ${episode.episodeNo}화`}
        episodeId={episode.id}
        price={episode.price}
        owned={owned}
        locked={locked}
        visibleUrls={visibleUrls}
        videoUrl={videoUrl}
        previewVideoBlocked={previewVideoBlocked}
        paymentsEnabled={paymentsEnabled}
      />
    </div>
  );
}

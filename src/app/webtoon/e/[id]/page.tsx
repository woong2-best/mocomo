import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEpisodeAccess } from "@/actions/creator-works";
import { isPaymentsConfigured } from "@/lib/payments";
import { IllustrationArtworkViewer } from "@/components/webtoon/illustration-artwork-viewer";
import { WEBTOON_GENRE_LABEL } from "@/lib/webtoon/constants";
import { PurchaseEpisodeButton } from "@/components/works/purchase-episode-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Eye, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebtoonEpisodePage({
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
  if (access.episode.series.kind !== "WEBTOON") notFound();

  const { episode, owned, visibleUrls, locked } = access;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      <Link href="/webtoon">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          일러스트 마켓
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] items-start">
        <div className="min-w-0">
          <IllustrationArtworkViewer
            title={episode.title}
            episodeId={episode.id}
            price={episode.price}
            owned={owned}
            locked={locked}
            visibleUrls={visibleUrls}
            paymentsEnabled={paymentsEnabled}
          />
        </div>

        <aside className="rounded-2xl border border-border/60 bg-card p-4 space-y-4 lg:sticky lg:top-16">
          <div>
            <h1 className="text-lg font-bold leading-snug">{episode.title}</h1>
            <Link
              href={`/u/${episode.author.username}`}
              className="mt-3 flex items-center gap-2 group"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={episode.author.image ?? undefined} />
                <AvatarFallback>{episode.author.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium group-hover:text-[#0096fa]">
                @{episode.author.username}
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              판매 {episode.salesCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              조회 {episode.viewCount}
            </span>
            {episode.series.genre && (
              <span className="rounded-full border border-border/60 px-2 py-0.5">
                {WEBTOON_GENRE_LABEL[episode.series.genre]}
              </span>
            )}
          </div>

          <div className="text-2xl font-bold tabular-nums">
            {episode.price <= 0 ? "무료" : `${episode.price.toLocaleString()}원`}
          </div>

          {!owned && episode.price > 0 && (
            <PurchaseEpisodeButton
              episodeId={episode.id}
              price={episode.price}
              title={episode.title}
              paymentsEnabled={paymentsEnabled}
            />
          )}

          <Link href={`/webtoon/series/${episode.series.id}`} className="block text-xs text-[#0096fa] hover:underline">
            포트폴리오 · {episode.series.title}
          </Link>

          <p className="text-[10px] text-amber-700">캡처·녹화·복사가 제한된 구역입니다.</p>
        </aside>
      </div>
    </div>
  );
}

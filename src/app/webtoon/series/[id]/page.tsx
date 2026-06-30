import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCreatorSeries } from "@/actions/creator-works";
import { WEBTOON_GENRE_LABEL } from "@/lib/webtoon/constants";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebtoonSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await getCreatorSeries(id);
  if (!series || series.kind !== "WEBTOON") notFound();

  const session = await auth();
  const isAuthor = session?.user?.id === series.authorId;

  return (
    <div className="space-y-4">
      <Link href="/webtoon">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          일러스트 마켓
        </Button>
      </Link>
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={series.coverUrl} alt="" className="w-32 aspect-square rounded-xl object-cover border shrink-0" />
        <div>
          <p className="text-xs text-[#0096fa] font-semibold">포트폴리오</p>
          <h1 className="text-xl font-bold mt-1">{series.title}</h1>
          <Link href={`/u/${series.author.username}`} className="text-sm text-muted-foreground mt-1 hover:text-[#0096fa]">
            @{series.author.username}
          </Link>
          {series.genre && (
            <span className="inline-block mt-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium">
              {WEBTOON_GENRE_LABEL[series.genre]}
            </span>
          )}
          {series.description && <p className="text-sm mt-3 text-muted-foreground">{series.description}</p>}
          <p className="text-xs text-muted-foreground mt-2">{series.episodes.length}개 작품</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {series.episodes.map((ep) => (
          <Link
            key={ep.id}
            href={`/webtoon/e/${ep.id}`}
            className="group rounded-xl border border-border/60 overflow-hidden hover:border-[#0096fa]/40 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                (Array.isArray(ep.previewUrls) && typeof ep.previewUrls[0] === "string"
                  ? ep.previewUrls[0]
                  : null) ?? series.coverUrl
              }
              alt=""
              className="w-full aspect-square object-cover"
            />
            <div className="p-2.5 space-y-1">
              <p className="text-xs font-semibold line-clamp-2 group-hover:text-[#0096fa]">{ep.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {ep.price <= 0 ? "무료" : `${ep.price.toLocaleString()}원`}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {isAuthor && (
        <Link href="/webtoon/studio">
          <Button variant="outline" className="rounded-xl w-full border-[#0096fa]/40 text-[#0096fa]">
            작품 판매 · 새 그림 등록
          </Button>
        </Link>
      )}
    </div>
  );
}

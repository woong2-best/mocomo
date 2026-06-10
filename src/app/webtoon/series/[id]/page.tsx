import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCreatorSeries } from "@/actions/creator-works";
import { WEBTOON_DAY_FULL, WEBTOON_GENRE_LABEL } from "@/lib/webtoon/constants";
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
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href="/webtoon">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          요일별 웹툰
        </Button>
      </Link>
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={series.coverUrl} alt="" className="w-28 aspect-[3/4] rounded-lg object-cover border shrink-0" />
        <div>
          <h1 className="text-xl font-bold">{series.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">@{series.author.username}</p>
          {series.publishDay && (
            <p className="text-xs text-emerald-600 font-medium mt-2">{WEBTOON_DAY_FULL[series.publishDay]}</p>
          )}
          {series.genre && (
            <span className="inline-block mt-2 rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium">
              {WEBTOON_GENRE_LABEL[series.genre]}
            </span>
          )}
          {series.description && <p className="text-sm mt-3 text-muted-foreground">{series.description}</p>}
        </div>
      </div>
      <ul className="space-y-2">
        {series.episodes.map((ep) => (
          <li key={ep.id}>
            <Link
              href={`/webtoon/e/${ep.id}`}
              className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 hover:border-emerald-500/40"
            >
              <span className="font-medium text-sm">
                {ep.episodeNo}화 · {ep.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {ep.price <= 0 ? "무료" : `${ep.price.toLocaleString()}원`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {isAuthor && (
        <Link href="/webtoon/studio">
          <Button variant="outline" className="rounded-xl w-full">
            웹툰 스튜디오에서 회차 추가
          </Button>
        </Link>
      )}
    </div>
  );
}

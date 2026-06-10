import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCreatorSeries } from "@/actions/creator-works";
import { CREATOR_WORK_KIND_LABEL } from "@/lib/creator-work-labels";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WorksSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await getCreatorSeries(id);
  if (!series) notFound();

  return (
    <div className="space-y-5">
      <Link href="/works">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          작품 홈
        </Button>
      </Link>

      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={series.coverUrl} alt="" className="w-28 sm:w-36 rounded-xl object-cover aspect-[3/4] shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{CREATOR_WORK_KIND_LABEL[series.kind]}</p>
          <h1 className="text-xl font-bold">{series.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">@{series.author.username}</p>
          {series.description && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{series.description}</p>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">회차</h2>
        {series.episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 회차가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
            {series.episodes.map((ep) => (
              <li key={ep.id}>
                <Link
                  href={`/works/e/${ep.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {ep.episodeNo}화 · {ep.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{ep.salesCount}회 구매</p>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">
                    {ep.price <= 0 ? "무료" : `${ep.price.toLocaleString()}원`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

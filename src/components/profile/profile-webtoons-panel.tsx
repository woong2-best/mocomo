import Link from "next/link";
import { isPaymentsConfigured } from "@/lib/payments";
import { PurchaseEpisodeButton } from "@/components/works/purchase-episode-button";
import { WEBTOON_DAY_FULL } from "@/lib/webtoon/constants";
import type { WebtoonPublishDay } from "@prisma/client";
import { BookOpen } from "lucide-react";

type ProfileSeries = {
  id: string;
  title: string;
  coverUrl: string;
  publishDay: WebtoonPublishDay | null;
  episodes: {
    id: string;
    title: string;
    episodeNo: number;
    price: number;
    owned: boolean;
  }[];
};

export function ProfileWebtoonsPanel({
  series,
  username,
}: {
  series: ProfileSeries[];
  username: string;
}) {
  if (series.length === 0) return null;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <aside className="border-t lg:border-t-0 lg:border-l border-border/40 bg-muted/20 lg:min-h-[320px]">
      <div className="sticky top-14 p-4 space-y-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-600" />
          <h2 className="font-bold text-sm">웹툰</h2>
        </div>
        {series.map((s) => (
          <div key={s.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Link href={`/webtoon/series/${s.id}`} className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.coverUrl} alt="" className="w-full aspect-[3/4] object-cover" />
            </Link>
            <div className="p-3 space-y-2">
              <Link href={`/webtoon/series/${s.id}`} className="font-semibold text-sm hover:text-primary line-clamp-2">
                {s.title}
              </Link>
              {s.publishDay && (
                <p className="text-[10px] text-emerald-700 font-medium">{WEBTOON_DAY_FULL[s.publishDay]}</p>
              )}
              <ul className="space-y-2">
                {s.episodes.map((ep) => (
                  <li key={ep.id} className="rounded-lg border border-border/50 p-2 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/webtoon/e/${ep.id}`} className="text-xs font-medium hover:text-primary">
                        {ep.episodeNo}화 {ep.title ? `· ${ep.title}` : ""}
                      </Link>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {ep.price <= 0 ? "무료" : `${ep.price.toLocaleString()}원`}
                      </span>
                    </div>
                    {ep.owned ? (
                      <Link
                        href={`/webtoon/e/${ep.id}`}
                        className="block text-center text-[11px] font-medium text-emerald-600 py-1"
                      >
                        보기
                      </Link>
                    ) : ep.price > 0 ? (
                      <PurchaseEpisodeButton
                        episodeId={ep.id}
                        price={ep.price}
                        title={`${s.title} ${ep.episodeNo}화`}
                        paymentsEnabled={paymentsEnabled}
                      />
                    ) : (
                      <Link
                        href={`/webtoon/e/${ep.id}`}
                        className="block text-center text-[11px] font-medium text-primary py-1"
                      >
                        무료 보기
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground text-center">@{username}의 웹툰 · 회차별 개별 결제</p>
      </div>
    </aside>
  );
}

import Link from "next/link";
import type { WebtoonPublishDay } from "@prisma/client";
import {
  WEBTOON_DAY_FULL,
  WEBTOON_WEEK_DAYS,
  getTodayWebtoonDay,
} from "@/lib/webtoon/constants";
import { cn } from "@/lib/utils";

type SeriesItem = {
  id: string;
  title: string;
  coverUrl: string;
  author: { username: string | null; name: string | null };
  episodes: { id: string; episodeNo: number; price: number; createdAt: Date }[];
};

export function WebtoonWeeklyGrid({
  byDay,
}: {
  byDay: Record<WebtoonPublishDay, SeriesItem[]>;
}) {
  const today = getTodayWebtoonDay();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">요일별 전체 웹툰</h1>
          <p className="text-xs text-muted-foreground mt-1">작가가 설정한 연재 요일별로 모아 봅니다.</p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">업데이트순</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-2 min-w-[980px]">
          {WEBTOON_WEEK_DAYS.map((day) => {
            const items = byDay[day] ?? [];
            const isToday = day === today;
            return (
              <div
                key={day}
                className={cn(
                  "flex-1 min-w-[132px] rounded-lg border overflow-hidden",
                  isToday ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-border/60 bg-card"
                )}
              >
                <div
                  className={cn(
                    "px-2 py-2 text-center text-xs font-bold",
                    isToday ? "bg-emerald-500 text-white" : "bg-muted/70 text-foreground"
                  )}
                >
                  {WEBTOON_DAY_FULL[day]}
                </div>
                <ul className="p-2 space-y-3 max-h-[70vh] overflow-y-auto">
                  {items.length === 0 ? (
                    <li className="text-[11px] text-muted-foreground text-center py-6">등록된 웹툰 없음</li>
                  ) : (
                    items.map((s) => {
                      const latest = s.episodes[0];
                      const href = latest ? `/webtoon/e/${latest.id}` : `/webtoon/series/${s.id}`;
                      return (
                        <li key={s.id}>
                          <Link href={href} className="block group">
                            <div className="relative rounded-md overflow-hidden border border-border/40 bg-muted/30">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={s.coverUrl}
                                alt=""
                                className="w-full aspect-[3/4] object-cover group-hover:opacity-95 transition-opacity"
                                draggable={false}
                              />
                            </div>
                            <p className="mt-1.5 text-[11px] font-medium leading-tight line-clamp-2 group-hover:text-primary">
                              {s.title}
                              {latest && latest.price <= 0 ? (
                                <span className="ml-1 text-[10px] text-emerald-600 font-bold">UP</span>
                              ) : null}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">@{s.author.username}</p>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: LiveStreamCategory[] = [
  "IRL",
  "JUST_CHATTING",
  "GAME",
  "MUSIC",
  "LIVE",
];

const CATEGORY_STYLE: Record<
  LiveStreamCategory,
  { overlay: string; accent: string }
> = {
  IRL: {
    overlay: "from-[hsl(145,35%,28%)] via-[hsl(145,28%,38%)] to-[hsl(40,40%,55%)]",
    accent: "bg-[hsl(145,40%,40%)]",
  },
  JUST_CHATTING: {
    overlay: "from-[hsl(220,45%,32%)] via-[hsl(220,40%,42%)] to-[hsl(28,55%,55%)]",
    accent: "bg-[hsl(220,45%,40%)]",
  },
  GAME: {
    overlay: "from-[hsl(12,55%,38%)] via-[hsl(18,50%,42%)] to-[hsl(35,45%,50%)]",
    accent: "bg-folk-terracotta",
  },
  MUSIC: {
    overlay: "from-[hsl(280,30%,32%)] via-[hsl(300,25%,38%)] to-[hsl(35,50%,55%)]",
    accent: "bg-[hsl(280,35%,42%)]",
  },
  LIVE: {
    overlay: "from-[hsl(350,45%,32%)] via-[hsl(12,50%,40%)] to-[hsl(30,45%,48%)]",
    accent: "bg-folk-terracotta",
  },
};

function formatViewerCount(n: number, locale: string) {
  if (n >= 10000) {
    const man = n / 10000;
    return locale.startsWith("ko")
      ? `${man >= 10 ? Math.round(man) : man.toFixed(1).replace(/\.0$/, "")}만명 시청 중`
      : `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K watching`;
  }
  if (n >= 1000) {
    return locale.startsWith("ko")
      ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천명 시청 중`
      : `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K watching`;
  }
  return locale.startsWith("ko") ? `${n}명 시청 중` : `${n} watching`;
}

export function LivePopularCategories({
  viewerByCategory,
}: {
  viewerByCategory: Partial<Record<LiveStreamCategory, number>>;
}) {
  const { locale, t } = useLocale();
  const ranked = [...CATEGORY_ORDER].sort(
    (a, b) => (viewerByCategory[b] ?? 0) - (viewerByCategory[a] ?? 0)
  );

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-base sm:text-lg font-bold tracking-tight">
          {t("live.popularCategories")}
        </h2>
        <Link
          href="/live"
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {t("live.viewAll")}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {ranked.map((cat) => {
          const viewers = viewerByCategory[cat] ?? 0;
          const style = CATEGORY_STYLE[cat];
          const label = localizedLiveCategoryLabel(cat, locale);
          return (
            <Link
              key={cat}
              href={`/live?category=${cat}`}
              className="group shrink-0 w-[132px] sm:w-[148px]"
            >
              <div
                className={cn(
                  "relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm border border-border/50",
                  "bg-gradient-to-br",
                  style.overlay
                )}
              >
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/35 to-transparent">
                  <p className="text-white font-black text-sm sm:text-[15px] leading-tight uppercase tracking-wide drop-shadow">
                    {label}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1 min-w-0">
                <p className="text-sm font-semibold truncate">{label}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {formatViewerCount(viewers, locale)}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md text-white/95 font-medium",
                      style.accent
                    )}
                  >
                    {label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

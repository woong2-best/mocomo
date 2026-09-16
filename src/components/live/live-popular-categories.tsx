"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import {
  LIVE_CATEGORY_ICON,
  LIVE_CATEGORY_ORDER,
} from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE: Record<
  LiveStreamCategory,
  { overlay: string; accent: string }
> = {
  IRL: {
    overlay: "from-[hsl(145,35%,18%)] via-[hsl(145,28%,22%)] to-[hsl(40,30%,20%)]",
    accent: "bg-[hsl(145,40%,40%)]",
  },
  JUST_CHATTING: {
    overlay: "from-[hsl(220,45%,16%)] via-[hsl(220,40%,22%)] to-[hsl(28,35%,20%)]",
    accent: "bg-[hsl(220,45%,40%)]",
  },
  GAME: {
    overlay: "from-[hsl(12,45%,18%)] via-[hsl(18,40%,22%)] to-[hsl(35,35%,20%)]",
    accent: "bg-folk-terracotta",
  },
  MUSIC: {
    overlay: "from-[hsl(280,30%,16%)] via-[hsl(300,25%,20%)] to-[hsl(35,30%,20%)]",
    accent: "bg-[hsl(280,35%,42%)]",
  },
  VIRTUAL: {
    overlay: "from-[hsl(330,40%,22%)] via-[hsl(340,35%,28%)] to-[hsl(20,40%,30%)]",
    accent: "bg-[hsl(340,45%,55%)]",
  },
  LIVE: {
    overlay: "from-[hsl(350,40%,16%)] via-[hsl(12,40%,20%)] to-[hsl(30,35%,20%)]",
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

function CategoryFolderArt({
  category,
  label,
}: {
  category: LiveStreamCategory;
  label: string;
}) {
  const style = CATEGORY_STYLE[category];
  const icon = LIVE_CATEGORY_ICON[category];

  return (
    <div
      className={cn(
        "relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm border border-border/40",
        "bg-gradient-to-br",
        style.overlay
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        className="absolute inset-0 h-full w-full object-contain p-2 sm:p-2.5 drop-shadow-md"
        draggable={false}
      />
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/35 to-transparent">
        <p className="text-white font-black text-[11px] sm:text-xs leading-tight uppercase tracking-wide drop-shadow line-clamp-2">
          {label}
        </p>
      </div>
    </div>
  );
}

export function LivePopularCategories({
  viewerByCategory,
  variant = "row",
}: {
  viewerByCategory: Partial<Record<LiveStreamCategory, number>>;
  variant?: "row" | "sidebar";
}) {
  const { locale, t } = useLocale();
  const ranked = [...LIVE_CATEGORY_ORDER].sort(
    (a, b) => (viewerByCategory[b] ?? 0) - (viewerByCategory[a] ?? 0)
  );

  if (variant === "sidebar") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full sm:w-[280px] lg:w-[300px] shrink-0 content-start">
        {ranked.map((cat) => {
          const label = localizedLiveCategoryLabel(cat, locale);
          return (
            <Link key={cat} href={`/live?category=${cat}`} className="group block min-w-0">
              <CategoryFolderArt category={cat} label={label} />
            </Link>
          );
        })}
      </div>
    );
  }

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
            <Link key={cat} href={`/live?category=${cat}`} className="group shrink-0 w-[132px] sm:w-[148px]">
              <CategoryFolderArt category={cat} label={label} />
              <div className="mt-2 space-y-1 min-w-0">
                <p className="text-sm font-semibold truncate">{label}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {formatViewerCount(viewers, locale)}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-md text-white/95 font-medium uppercase",
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

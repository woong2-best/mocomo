"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import {
  LIVE_CATEGORY_ICON,
  LIVE_CATEGORY_ORDER,
  isR18LiveCategory,
} from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";

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

/** Full folder asset + label drawn ON the folder (bottom-left). */
function CategoryFolderTile({
  category,
  label,
}: {
  category: LiveStreamCategory;
  label: string;
}) {
  return (
    <div className="relative w-full aspect-[5/6]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LIVE_CATEGORY_ICON[category]}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      <p
        className={cn(
          "absolute bottom-[12%] left-[14%] right-[10%]",
          "text-white font-black text-[11px] sm:text-xs leading-tight uppercase tracking-wide",
          "drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] line-clamp-2"
        )}
      >
        {label}
      </p>
    </div>
  );
}

function categoryHref(cat: LiveStreamCategory) {
  return cat === "VIRTUAL" ? "/live?view=following" : `/live?category=${cat}`;
}

export function LivePopularCategories({
  viewerByCategory,
  variant = "row",
}: {
  viewerByCategory: Partial<Record<LiveStreamCategory, number>>;
  variant?: "row" | "sidebar";
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const cats = LIVE_CATEGORY_ORDER;
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();

  async function onCategoryActivate(
    e: MouseEvent,
    cat: LiveStreamCategory
  ) {
    if (!isR18LiveCategory(cat)) return;
    e.preventDefault();
    if (checking) return;
    const ok = await guardCategoryNav(cat);
    if (ok) router.push(categoryHref(cat));
  }

  if (variant === "sidebar") {
    return (
      <>
        <div
          className={cn(
            "grid grid-cols-2 gap-2 sm:gap-2.5 content-start",
            "w-full sm:w-[260px] lg:w-[280px] shrink-0"
          )}
        >
          {cats.map((cat) => {
            const label = localizedLiveCategoryLabel(cat, locale);
            const href = categoryHref(cat);
            return (
              <Link
                key={cat}
                href={href}
                onClick={(e) => void onCategoryActivate(e, cat)}
                className="group block min-w-0 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
                aria-label={label}
              >
                <CategoryFolderTile category={cat} label={label} />
              </Link>
            );
          })}
        </div>
        <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
      </>
    );
  }

  return (
    <>
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
          {cats.map((cat) => {
            const viewers = viewerByCategory[cat] ?? 0;
            const label = localizedLiveCategoryLabel(cat, locale);
            const href = categoryHref(cat);
            return (
              <Link
                key={cat}
                href={href}
                onClick={(e) => void onCategoryActivate(e, cat)}
                className="group shrink-0 w-[132px] sm:w-[148px]"
                aria-label={label}
              >
                <CategoryFolderTile category={cat} label={label} />
                <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                  {formatViewerCount(viewers, locale)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}

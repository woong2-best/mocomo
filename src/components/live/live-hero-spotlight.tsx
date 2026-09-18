"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import {
  LIVE_CATEGORY_ORDER,
  LIVE_CATEGORY_TAB,
  LIVE_SMPTE_COLORS,
  isR18LiveCategory,
} from "@/lib/live-categories";
import type { LiveStreamCategory } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import { LiveHeroCarousel } from "@/components/live/live-hero-carousel";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";

function categoryHref(cat: LiveStreamCategory) {
  return cat === "VIRTUAL" ? "/live?view=following" : `/live?category=${cat}`;
}

/**
 * Empty TV with half-cut folder tabs sitting flush on matching color columns.
 * Folders = buttons; color bars = display only (not clickable).
 */
function LiveTvWithFolderTabs({ className }: { className?: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const currentCat = searchParams.get("category");
  const following = searchParams.get("view") === "following";
  const cats = LIVE_CATEGORY_ORDER;
  // 6 category columns + trailing teal filler (SMPTE 7th bar)
  const colCount = cats.length + 1;

  async function onCategoryActivate(e: MouseEvent, cat: LiveStreamCategory) {
    if (!isR18LiveCategory(cat)) return;
    e.preventDefault();
    if (checking) return;
    const ok = await guardCategoryNav(cat);
    if (ok) router.push(categoryHref(cat));
  }

  return (
    <>
      <div
        className={cn(
          "relative h-full w-full min-h-0 flex flex-col",
          "rounded-2xl border border-border/50 bg-black shadow-lg overflow-hidden",
          checking && "opacity-80",
          className
        )}
      >
        {/* Folder tabs — one per category column, flush on the color bars below */}
        <div
          className="relative z-20 grid shrink-0 w-full"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {cats.map((cat, i) => {
            const label = localizedLiveCategoryLabel(cat, locale);
            const href = categoryHref(cat);
            const active =
              cat === "VIRTUAL" ? following : !following && currentCat === cat;
            return (
              <Link
                key={cat}
                href={href}
                onClick={(e) => void onCategoryActivate(e, cat)}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-end justify-center",
                  "h-[clamp(36px,7.5vw,72px)] -mb-px",
                  "transition-transform duration-150 hover:brightness-110 active:scale-[0.98]",
                  active && "z-10 brightness-110"
                )}
                style={{ zIndex: active ? 30 : i + 1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LIVE_CATEGORY_TAB[cat]}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-x-0 bottom-0 h-full w-full object-contain object-bottom select-none pointer-events-none"
                />
                <span
                  className={cn(
                    "relative z-10 mb-[18%] px-0.5 text-center",
                    "text-white font-black uppercase tracking-wide",
                    "text-[clamp(7px,1.35vw,12px)] leading-tight",
                    "drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
          {/* teal filler column — no folder button */}
          <div aria-hidden className="h-[clamp(36px,7.5vw,72px)]" />
        </div>

        {/* TV color bars — display only, not buttons */}
        <div
          className="relative z-10 flex-1 min-h-0 grid w-full"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {LIVE_SMPTE_COLORS.map((color) => (
            <div key={color} className="h-full min-h-0" style={{ backgroundColor: color }} />
          ))}
        </div>

        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none pt-[clamp(36px,7.5vw,72px)]">
          <p className="rounded-full bg-black/70 px-5 py-2.5 text-sm sm:text-base font-semibold text-white backdrop-blur-sm border border-white/15">
            {t("live.noBroadcastHero")}
          </p>
        </div>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}

/** TV stage: folder-tabbed SMPTE when empty, live carousel when streaming. */
export function LiveHeroSpotlight({
  channels,
  hostMap,
  className,
}: {
  channels: LiveHubChannel[];
  hostMap: Record<string, LiveHubHost>;
  className?: string;
}) {
  if (channels.length === 0) {
    return <LiveTvWithFolderTabs className={className} />;
  }

  return (
    <div className={cn("relative h-full w-full min-h-0 overflow-hidden", className)}>
      <LiveHeroCarousel channels={channels} hostMap={hostMap} />
    </div>
  );
}

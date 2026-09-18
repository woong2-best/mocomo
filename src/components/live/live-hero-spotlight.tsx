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
 * Empty TV: each color column owns its folder tab (no black gaps on resize).
 * Folders = buttons; color body = display only.
 */
function LiveTvWithFolderTabs({ className }: { className?: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const currentCat = searchParams.get("category");
  const following = searchParams.get("view") === "following";
  const cats = LIVE_CATEGORY_ORDER;

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
          "relative h-full w-full min-h-0 overflow-hidden rounded-2xl border border-white/10 shadow-lg",
          checking && "opacity-80",
          className
        )}
      >
        {/* One continuous grid — folder + color share the same column (no split gaps). */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${LIVE_SMPTE_COLORS.length}, minmax(0, 1fr))` }}
        >
          {cats.map((cat, i) => {
            const color = LIVE_SMPTE_COLORS[i]!;
            const label = localizedLiveCategoryLabel(cat, locale);
            const href = categoryHref(cat);
            const active =
              cat === "VIRTUAL" ? following : !following && currentCat === cat;

            return (
              <div
                key={cat}
                className="relative flex min-h-0 min-w-0 flex-col"
                style={{ backgroundColor: color }}
              >
                {/* Folder button sits on its own color — transparent PNG, no black plate */}
                <Link
                  href={href}
                  onClick={(e) => void onCategoryActivate(e, cat)}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-20 w-full shrink-0",
                    "aspect-[5/3] max-h-[28%]",
                    "transition-[filter] duration-150 hover:brightness-110",
                    active && "brightness-110"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={LIVE_CATEGORY_TAB[cat]}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover object-top select-none pointer-events-none"
                  />
                  <span
                    className={cn(
                      "absolute inset-x-[6%] bottom-[14%] z-10 text-center",
                      "text-white font-black uppercase tracking-wide",
                      "text-[clamp(7px,1.2vw,12px)] leading-tight",
                      "drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2"
                    )}
                  >
                    {label}
                  </span>
                </Link>
                {/* Rest of column = solid TV color (not a button) */}
                <div className="min-h-0 flex-1" aria-hidden />
              </div>
            );
          })}

          {/* Teal filler — display only */}
          <div
            className="min-h-0 min-w-0"
            style={{ backgroundColor: LIVE_SMPTE_COLORS[cats.length] }}
            aria-hidden
          />
        </div>

        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
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

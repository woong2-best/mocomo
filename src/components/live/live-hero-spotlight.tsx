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
 * Empty TV: half-cut folder TABS sit on the top edge of the color-bar TV
 * (like photo 2 — above the bars, not filling tall color columns).
 * Folders = buttons; color bars = display only.
 */
function LiveTvWithFolderTabs({ className }: { className?: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { blockedOpen, setBlockedOpen, guardCategoryNav, checking } = useLiveR18Gate();
  const currentCat = searchParams.get("category");
  const following = searchParams.get("view") === "following";
  const cats = LIVE_CATEGORY_ORDER;
  const colCount = LIVE_SMPTE_COLORS.length;

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
          "relative flex h-full w-full min-h-0 flex-col",
          checking && "opacity-80",
          className
        )}
      >
        {/* Folder tabs — sit ON TOP of the TV bars (not inside tall columns) */}
        <div
          className="relative z-20 grid w-full shrink-0"
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
                  "relative min-w-0 w-full",
                  // Width-driven height only — stays a compact tab, not a tall slab
                  "aspect-[5/3.1]",
                  "mb-[-2px]", // slight overlap so tab sits flush on the bar
                  "transition-[filter] duration-150 hover:brightness-110",
                  active && "z-10 brightness-110"
                )}
                style={{ zIndex: active ? 20 : i + 1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LIVE_CATEGORY_TAB[cat]}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain object-bottom select-none pointer-events-none"
                />
                <span
                  className={cn(
                    "absolute inset-x-[8%] bottom-[16%] z-10 text-center",
                    "text-white font-black uppercase tracking-wide",
                    "text-[clamp(7px,1.15vw,11px)] leading-tight",
                    "drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] line-clamp-2"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
          {/* Teal column has no folder tab */}
          <div aria-hidden className="min-w-0" />
        </div>

        {/* TV color bars — display only, flush under tabs */}
        <div
          className="relative z-10 min-h-0 flex-1 overflow-hidden rounded-b-2xl border border-t-0 border-white/10 shadow-lg"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          }}
          aria-hidden
        >
          {LIVE_SMPTE_COLORS.map((color, i) => (
            <div
              key={color}
              className={cn(
                "min-h-0 min-w-0 h-full",
                i === 0 && "rounded-bl-2xl",
                i === LIVE_SMPTE_COLORS.length - 1 && "rounded-br-2xl"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[18%] z-30 flex items-center justify-center">
          <p className="rounded-full border border-white/15 bg-black/70 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm sm:text-base">
            {t("live.noBroadcastHero")}
          </p>
        </div>
      </div>
      <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />
    </>
  );
}

/** TV stage: folder tabs above color bars when empty; live carousel when streaming. */
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

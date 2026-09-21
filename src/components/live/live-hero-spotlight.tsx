"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LIVE_SMPTE_COLORS } from "@/lib/live-categories";
import { cn } from "@/lib/utils";
import { LiveHeroCarousel } from "@/components/live/live-hero-carousel";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";

/** Tiny decorative TV — SMPTE bars only (folders live in the side rail). */
function LiveMiniEmptyTv({ className }: { className?: string }) {
  const { t } = useLocale();
  const colCount = LIVE_SMPTE_COLORS.length;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[200px] sm:max-w-[240px]",
        className
      )}
    >
      <div
        className="relative h-[56px] sm:h-[64px] overflow-hidden rounded-xl border border-white/15 shadow-md"
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
              i === 0 && "rounded-l-xl",
              i === LIVE_SMPTE_COLORS.length - 1 && "rounded-r-xl"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <p className="rounded-full border border-white/15 bg-black/75 px-2.5 py-1 text-[9px] font-semibold text-white backdrop-blur-sm sm:text-[10px]">
          {t("live.noBroadcastHero")}
        </p>
      </div>
    </div>
  );
}

/** Compact TV stage above the YouTube-style grid. */
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
    return <LiveMiniEmptyTv className={className} />;
  }

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[360px] sm:max-w-[420px] aspect-video overflow-hidden rounded-xl border border-white/10 shadow-lg",
        className
      )}
    >
      <LiveHeroCarousel channels={channels} hostMap={hostMap} />
    </div>
  );
}

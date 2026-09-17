"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LiveHeroCarousel } from "@/components/live/live-hero-carousel";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";
import { cn } from "@/lib/utils";

/** Empty TV — fills parent box (parent owns size). */
function SmpteEmptyState({ className }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-border/50 bg-black shadow-lg",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            #e090b0 0%, #e090b0 14.28%,
            #e08020 14.28%, #e08020 28.56%,
            #0000c0 28.56%, #0000c0 42.84%,
            #00c000 42.84%, #00c000 57.12%,
            #c000c0 57.12%, #c000c0 71.4%,
            #c00000 71.4%, #c00000 85.68%,
            #00c0c0 85.68%, #00c0c0 100%
          )`,
        }}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="rounded-full bg-black/70 px-5 py-2.5 text-sm sm:text-base font-semibold text-white backdrop-blur-sm border border-white/15">
          {t("live.noBroadcastHero")}
        </p>
      </div>
    </div>
  );
}

/** TV screen fills the stage slot — never collapses to 0 height. */
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
    return <SmpteEmptyState className={className} />;
  }

  return (
    <div className={cn("relative h-full w-full min-h-0 overflow-hidden", className)}>
      <LiveHeroCarousel channels={channels} hostMap={hostMap} />
    </div>
  );
}

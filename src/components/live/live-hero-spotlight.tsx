"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { LiveHeroCarousel } from "@/components/live/live-hero-carousel";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";

function SmpteEmptyState() {
  const { t } = useLocale();

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black shadow-lg">
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            90deg,
            #c0c0c0 0%, #c0c0c0 14.28%,
            #c0c000 14.28%, #c0c000 28.56%,
            #00c0c0 28.56%, #00c0c0 42.84%,
            #00c000 42.84%, #00c000 57.12%,
            #c000c0 57.12%, #c000c0 71.4%,
            #c00000 71.4%, #c00000 85.68%,
            #0000c0 85.68%, #0000c0 100%
          )`,
        }}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="rounded-xl bg-black/70 px-5 py-3 text-sm sm:text-base font-semibold text-white backdrop-blur-sm">
          {t("live.noBroadcastHero")}
        </p>
      </div>
    </div>
  );
}

export function LiveHeroSpotlight({
  channels,
  hostMap,
}: {
  channels: LiveHubChannel[];
  hostMap: Record<string, LiveHubHost>;
}) {
  if (channels.length === 0) {
    return <SmpteEmptyState />;
  }

  return <LiveHeroCarousel channels={channels} hostMap={hostMap} />;
}

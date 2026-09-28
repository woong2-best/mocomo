"use client";

import { LiveNoBroadcastEmpty } from "@/components/live/live-no-broadcast-empty";
import { cn } from "@/lib/utils";
import { LiveHeroCarousel } from "@/components/live/live-hero-carousel";
import type { LiveHubChannel, LiveHubHost } from "@/lib/live-hub-data";

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
    return <LiveNoBroadcastEmpty className={className} />;
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

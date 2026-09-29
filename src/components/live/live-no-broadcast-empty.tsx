"use client";

import { LiveHubHeroRail } from "@/components/live/live-hub-hero-rail";
import { cn } from "@/lib/utils";

/** Swipeable off-air TV rail (same as /live hero), not plain text. */
export function LiveNoBroadcastEmpty({ className }: { className?: string }) {
  return (
    <LiveHubHeroRail
      channels={[]}
      hosts={[]}
      className={cn("h-[clamp(240px,48vh,520px)] min-h-[240px] w-full", className)}
    />
  );
}

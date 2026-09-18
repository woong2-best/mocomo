"use client";

import { useEffect } from "react";
import type { SupportTierLevel } from "@prisma/client";
import { SponsoredSidebarCard } from "@/components/events/sponsored-sidebar-card";
import { SidebarEventMapCard } from "@/components/events/sidebar-event-map-card";
import type { MapEventPin } from "@/lib/subculture-events";
import type { SponsorSpotEvent } from "@/lib/sponsor-spot-server";

export type SidebarPanelData = {
  tips: {
    rank: number;
    total: number;
    user?: {
      id: string;
      username: string;
      image: string | null;
      supportTierSent: SupportTierLevel;
    } | null;
  }[];
  sidebarAds: { id: string; title: string; imageUrl: string; linkUrl: string; ctaLabel: string | null }[];
  eventPins: MapEventPin[];
  sponsorEvent?: SponsorSpotEvent | null;
};

export function RightPanelSkeleton() {
  return (
    <aside className="hidden lg:flex w-56 xl:w-60 min-w-0 shrink-0 h-full flex-col justify-start gap-3 shell-col-pad folk-panel-aside overflow-hidden overscroll-none">
      <div className="shrink-0 w-full rounded-2xl border-2 border-folk-gold/20 bg-muted/40 animate-pulse aspect-[5/3]" />
      <div className="min-h-0 flex-1 w-full rounded-2xl border border-violet-500/20 bg-muted/30 animate-pulse" />
    </aside>
  );
}

export function RightPanelContent({ sidebarAds, eventPins, sponsorEvent }: SidebarPanelData) {
  useEffect(() => {
    document.documentElement.classList.add("mocomo-hide-root-scrollbar");
    return () => document.documentElement.classList.remove("mocomo-hide-root-scrollbar");
  }, []);

  return (
    <aside className="hidden lg:flex w-56 xl:w-60 min-w-0 shrink-0 h-full flex-col justify-start gap-3 shell-col-pad folk-panel-aside overflow-hidden overscroll-none">
      <div className="w-full shrink-0 grow-0">
        <SponsoredSidebarCard sidebarAds={sidebarAds} initialSponsorEvent={sponsorEvent ?? null} />
      </div>
      <div className="min-h-0 w-full flex-1 overflow-hidden">
        <SidebarEventMapCard pins={eventPins} fillHeight />
      </div>
    </aside>
  );
}

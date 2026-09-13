"use client";

import type { SupportTierLevel } from "@prisma/client";
import { SponsoredSidebarCard } from "@/components/events/sponsored-sidebar-card";
import { SidebarEventMapCard } from "@/components/events/sidebar-event-map-card";
import type { MapEventPin } from "@/lib/subculture-events";

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
};

export function RightPanelSkeleton() {
  return (
    <aside className="hidden lg:block w-56 xl:w-60 shrink-0 h-full shell-col-pad folk-panel-aside space-y-3 overflow-hidden overscroll-none animate-pulse">
      <div className="h-48 rounded-2xl bg-muted" />
    </aside>
  );
}

export function RightPanelContent({ sidebarAds, eventPins }: SidebarPanelData) {
  return (
    <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 h-full flex-col min-h-0 shell-col-pad folk-panel-aside gap-3 overflow-hidden overscroll-none">
      <SponsoredSidebarCard sidebarAds={sidebarAds} />

      {eventPins.length > 0 && (
        <SidebarEventMapCard pins={eventPins} className="flex-1 min-h-0" />
      )}
    </aside>
  );
}

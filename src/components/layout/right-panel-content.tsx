"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { SupportTierLevel } from "@prisma/client";
import { SponsoredSidebarCard } from "@/components/events/sponsored-sidebar-card";
import type { MapEventPin } from "@/lib/subculture-events";
import type { SponsorSpotEvent } from "@/lib/sponsor-spot-server";

const SidebarEventMapCard = dynamic(
  () => import("@/components/events/sidebar-event-map-card").then((m) => m.SidebarEventMapCard),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[8rem] w-full bg-muted/30" />,
  }
);

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
    <aside className="right-panel-rail">
      <div className="right-panel-ad">
        <img src="/ads/your-ad-here.jpg" alt="Your Ad Here" />
      </div>
      <div className="right-panel-map bg-muted/30" />
    </aside>
  );
}

export function RightPanelContent({ sidebarAds, eventPins, sponsorEvent }: SidebarPanelData) {
  useEffect(() => {
    document.documentElement.classList.add("mocomo-hide-root-scrollbar");
    return () => document.documentElement.classList.remove("mocomo-hide-root-scrollbar");
  }, []);

  return (
    <aside className="right-panel-rail">
      <div className="right-panel-ad">
        <SponsoredSidebarCard sidebarAds={sidebarAds} initialSponsorEvent={sponsorEvent ?? null} />
      </div>
      <div className="right-panel-map">
        <SidebarEventMapCard pins={eventPins} fillHeight />
      </div>
    </aside>
  );
}

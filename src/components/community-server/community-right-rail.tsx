"use client";

import { useEffect, useState } from "react";
import { SponsoredSidebarCard } from "@/components/events/sponsored-sidebar-card";
import { SidebarEventMapCard } from "@/components/events/sidebar-event-map-card";
import type { MapEventPin } from "@/lib/subculture-events";

type RailData = {
  sidebarAds: { id: string; title: string; imageUrl: string; linkUrl: string; ctaLabel: string | null }[];
  eventPins: MapEventPin[];
};

function CommunityRightRailSkeleton() {
  return (
    <aside className="right-panel-rail border-l border-border/60">
      <div className="right-panel-ad bg-muted/40" />
      <div className="right-panel-map bg-muted/30" />
    </aside>
  );
}

/** 커뮤니티 서버 우측 — 멤버 목록 대신 Sponsored + Subculture Map */
export function CommunityRightRail() {
  const [data, setData] = useState<RailData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    void (async () => {
      try {
        const res = await fetch("/api/sidebar", { signal: ac.signal, credentials: "same-origin" });
        const body = await res.json();
        if (cancelled) return;
        setData({
          sidebarAds: body.sidebarAds ?? [],
          eventPins: body.eventPins ?? [],
        });
      } catch {
        if (!cancelled) setData({ sidebarAds: [], eventPins: [] });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  if (!data) return <CommunityRightRailSkeleton />;

  return (
    <aside className="right-panel-rail border-l border-border/60">
      <div className="right-panel-ad">
        <SponsoredSidebarCard sidebarAds={data.sidebarAds} />
      </div>
      <div className="right-panel-map">
        <SidebarEventMapCard pins={data.eventPins} fillHeight />
      </div>
    </aside>
  );
}

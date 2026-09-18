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
    <aside className="hidden lg:flex w-56 xl:w-60 min-w-0 shrink-0 h-full flex-col justify-start gap-3 p-2 border-l border-border/60 bg-muted/10 overflow-hidden">
      <div className="shrink-0 w-full rounded-2xl border border-folk-gold/20 bg-muted/40 animate-pulse h-[13.5rem]" />
      <div className="min-h-0 flex-1 w-full rounded-2xl border border-violet-500/20 bg-muted/30 animate-pulse" />
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
    <aside className="hidden lg:flex w-56 xl:w-60 min-w-0 shrink-0 h-full flex-col justify-start gap-3 p-2 border-l border-border/60 bg-muted/10 overflow-hidden overscroll-none">
      <div className="shrink-0 w-full">
        <SponsoredSidebarCard sidebarAds={data.sidebarAds} />
      </div>
      <div className="min-h-0 flex-1 w-full">
        <SidebarEventMapCard pins={data.eventPins} fillHeight />
      </div>
    </aside>
  );
}

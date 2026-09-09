"use client";

import type { SupportTierLevel } from "@prisma/client";
import { FALLBACK_SIDEBAR_ADS } from "@/lib/default-ads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { SponsorEventSpot } from "@/components/events/sponsor-event-spot";
import { SidebarEventMapCard } from "@/components/events/sidebar-event-map-card";
import { useLocale } from "@/components/providers/locale-provider";
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
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-full shell-col-pad folk-panel-aside space-y-3 overflow-hidden overscroll-none animate-pulse">
      <div className="h-48 rounded-2xl bg-muted" />
    </aside>
  );
}

export function RightPanelContent({ sidebarAds, eventPins }: SidebarPanelData) {
  const { t } = useLocale();
  const ads =
    sidebarAds.length > 0
      ? sidebarAds
      : FALLBACK_SIDEBAR_ADS.map((a) => ({
          ...a,
          title: t("sidebar.fallbackEventAd"),
          ctaLabel: a.ctaLabel ?? null,
        }));

  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-full shell-col-pad folk-panel-aside space-y-3 overflow-hidden overscroll-none">
      <Card className="overflow-hidden border-folk-gold/40 bg-folk-gold/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2 font-display font-bold text-folk-terracotta">
              <Megaphone className="h-4 w-4" />
              {t("sidebar.sponsored")}
            </CardTitle>
            <Link
              href="/events"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-folk-terracotta/30 text-folk-terracotta transition-colors hover:bg-folk-terracotta/10"
              aria-label={t("nav.events")}
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <SponsorEventSpot fallbackAds={ads} />
        </CardContent>
      </Card>

      {eventPins.length > 0 && <SidebarEventMapCard pins={eventPins} />}
    </aside>
  );
}

"use client";

import Link from "next/link";
import type { SupportTierLevel } from "@prisma/client";
import { FALLBACK_SIDEBAR_ADS } from "@/lib/default-ads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tv, Megaphone } from "lucide-react";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";
import { RightPanelComposeButton } from "@/components/layout/right-panel-compose";
import { SidebarEventMapCard } from "@/components/events/sidebar-event-map-card";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeSidebarAdTitle } from "@/lib/sidebar-ad-i18n";
import { PopularAnimeSidebarList } from "@/components/layout/popular-anime-sidebar-list";
import type { MapEventPin } from "@/lib/subculture-events";

export type SidebarPanelData = {
  animes: { id: string; slug: string; title: string; titleEn: string | null; viewCount: number }[];
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
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 p-4 space-y-3 sticky top-[var(--header-h)] z-[1] h-[calc(100dvh-var(--header-h))] overflow-hidden folk-panel-aside animate-pulse">
      <div className="h-12 rounded-2xl bg-folk-terracotta/30" />
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="h-52 rounded-2xl bg-muted" />
    </aside>
  );
}

export function RightPanelContent({ animes, sidebarAds, eventPins }: SidebarPanelData) {
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
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 p-4 space-y-3 sticky top-[var(--header-h)] z-[1] h-[calc(100dvh-var(--header-h))] overflow-y-auto folk-panel-aside">
      <RightPanelComposeButton />
      <Card className="overflow-hidden border-folk-gold/40 bg-folk-gold/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-display font-bold text-folk-terracotta">
            <Megaphone className="h-4 w-4" />
            {t("sidebar.sponsored")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ads.map((ad) => {
            const href = sanitizeAdLink(ad.linkUrl);
            const external = isExternalUrl(href);
            return (
              <Link
                key={ad.id}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="block rounded-xl overflow-hidden border border-border/60 hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.title} className="w-full aspect-[4/3] object-cover" />
                <p className="text-xs p-2 font-medium">{localizeSidebarAdTitle(ad, t)}</p>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 font-display font-bold text-folk-cobalt">
            <Tv className="h-4 w-4 text-folk-cobalt" />
            {t("sidebar.popularAnime")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <PopularAnimeSidebarList animes={animes} />
        </CardContent>
      </Card>

      {eventPins.length > 0 && <SidebarEventMapCard pins={eventPins} />}
    </aside>
  );
}

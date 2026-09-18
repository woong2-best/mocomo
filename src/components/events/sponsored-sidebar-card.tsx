"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { SponsorAdClickLink } from "@/components/events/sponsor-ad-click-link";
import type { SponsorSpotEvent } from "@/lib/sponsor-spot-server";

type SidebarAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string | null;
};

export function SponsoredSidebarCard({
  sidebarAds: _sidebarAds,
  initialSponsorEvent = null,
}: {
  sidebarAds: SidebarAd[];
  initialSponsorEvent?: SponsorSpotEvent | null;
}) {
  const { t } = useLocale();
  const [event, setEvent] = useState<SponsorSpotEvent | null>(initialSponsorEvent);

  useEffect(() => {
    setEvent(initialSponsorEvent);
  }, [initialSponsorEvent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events/sponsor-spot", { credentials: "same-origin" });
        const body = await res.json();
        if (!cancelled && body.event) {
          setEvent(body.event);
        }
      } catch {
        /* keep SSR / empty slot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSponsorEvent = event != null;

  return (
    <Card className="shrink-0 overflow-hidden border-folk-gold/40 bg-folk-gold/5">
      <CardHeader className="px-3 py-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2 font-display font-bold text-folk-terracotta">
            <Megaphone className="h-4 w-4" />
            {t("sidebar.sponsored")}
          </CardTitle>
          <Link
            href="/events/new"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-folk-terracotta/30 text-folk-terracotta transition-colors hover:bg-folk-terracotta/10"
            aria-label={t("nav.events")}
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hasSponsorEvent ? (
          <SponsorAdClickLink
            linkUrl={event.linkUrl}
            className="group relative block w-full overflow-hidden hover:opacity-95 transition-opacity"
            aria-label={event.title || t("sidebar.sponsored")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl}
              alt=""
              className="block h-[13.5rem] w-full object-cover"
            />
          </SponsorAdClickLink>
        ) : (
          <Link
            href="/events/new"
            className="flex h-[13.5rem] w-full flex-col items-center justify-center gap-2 bg-muted/25 px-4 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Megaphone className="h-8 w-8 opacity-40" strokeWidth={1.5} />
            <span>{t("sidebar.sponsored")}</span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

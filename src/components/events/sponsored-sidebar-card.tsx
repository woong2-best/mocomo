"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
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

/** 사이드바 폭 기준 고정 — 모니터 높이에 따라 절대 늘어나거나 잘리지 않음 */
const AD_SLOT_CLASS = "block h-auto w-full shrink-0";

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
    <Card className="w-full shrink-0 grow-0 overflow-hidden border-folk-gold/40 bg-folk-gold/5">
      <CardHeader className="shrink-0 px-3 py-2.5 pb-2">
        <CardTitle className="text-sm flex items-center gap-2 font-display font-bold text-folk-terracotta">
          <Megaphone className="h-4 w-4" />
          {t("sidebar.sponsored")}
        </CardTitle>
      </CardHeader>
      <CardContent className="shrink-0 grow-0 p-0">
        {hasSponsorEvent ? (
          <SponsorAdClickLink
            linkUrl={event.linkUrl}
            className="group relative block w-full shrink-0 hover:opacity-95 transition-opacity"
            aria-label={event.title || t("sidebar.sponsored")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl}
              alt=""
              className={AD_SLOT_CLASS}
              draggable={false}
            />
          </SponsorAdClickLink>
        ) : (
          <Link
            href="/events/new"
            className="flex h-[7.5rem] w-full shrink-0 flex-col items-center justify-center gap-2 bg-muted/25 px-4 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Megaphone className="h-8 w-8 opacity-40" strokeWidth={1.5} />
            <span>{t("sidebar.sponsored")}</span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeSidebarAdTitle } from "@/lib/sidebar-ad-i18n";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";
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
  sidebarAds,
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
        /* keep SSR / fallback ads */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSponsorEvent = event != null;
  const hasFallbackAds = sidebarAds.length > 0;

  return (
    <Card className="shrink-0 overflow-hidden border-folk-gold/40 bg-folk-gold/5">
      <CardHeader className="px-3 py-2.5 pb-2">
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
      <CardContent className="p-0">
        {hasSponsorEvent ? (
          <SponsorAdClickLink
            linkUrl={event.linkUrl}
            className="group relative block w-full overflow-hidden hover:opacity-95 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.imageUrl}
              alt=""
              className="block w-full aspect-[4/5] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
              <p className="text-sm font-bold text-white line-clamp-2 group-hover:text-folk-gold transition-colors">
                {event.title}
              </p>
            </div>
          </SponsorAdClickLink>
        ) : hasFallbackAds ? (
          sidebarAds.map((ad) => {
            const href = sanitizeAdLink(ad.linkUrl);
            const external = isExternalUrl(href);
            const title = localizeSidebarAdTitle(ad, t);
            return (
              <Link
                key={ad.id}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group relative block w-full overflow-hidden hover:opacity-95 transition-opacity"
                aria-label={title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt="" className="block w-full aspect-[4/5] object-cover" />
                {ad.ctaLabel ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-3 pt-8">
                    <p className="text-[11px] font-semibold text-folk-gold">{ad.ctaLabel} →</p>
                  </div>
                ) : null}
              </Link>
            );
          })
        ) : (
          <Link
            href="/events"
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-muted/25 px-4 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Megaphone className="h-8 w-8 opacity-40" strokeWidth={1.5} />
            <span>{t("sidebar.sponsored")}</span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

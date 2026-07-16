"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FALLBACK_SIDEBAR_ADS } from "@/lib/default-ads";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeSidebarAdTitle } from "@/lib/sidebar-ad-i18n";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";

type SponsorEvent = { id: string; title: string; imageUrl: string };

type FallbackAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string | null;
};

export function SponsorEventSpot({ fallbackAds }: { fallbackAds: FallbackAd[] }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [event, setEvent] = useState<SponsorEvent | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);

    (async () => {
      try {
        const res = await fetch("/api/events/sponsor-spot", { credentials: "same-origin" });
        const body = await res.json();
        if (!cancelled) {
          setEvent(body.event ?? null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setEvent(null);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!loaded) {
    return <div className="h-36 rounded-xl bg-muted/60 animate-pulse" />;
  }

  if (event) {
    return (
      <Link
        href="/events"
        className="block rounded-xl overflow-hidden border border-border/60 hover:border-primary/40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full aspect-square object-cover"
        />
        <p className="text-xs p-2 font-medium line-clamp-2">{event.title}</p>
      </Link>
    );
  }

  const ads =
    fallbackAds.length > 0
      ? fallbackAds.map((a) => ({
          ...a,
          linkUrl: a.linkUrl === "/events/map" ? "/events" : a.linkUrl,
        }))
      : FALLBACK_SIDEBAR_ADS.map((a) => ({
          ...a,
          title: t("sidebar.fallbackEventAd"),
          ctaLabel: a.ctaLabel ?? null,
        }));

  return (
    <>
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
            <img src={ad.imageUrl} alt={ad.title} className="w-full aspect-square object-cover" />
            <p className="text-xs p-2 font-medium">{localizeSidebarAdTitle(ad, t)}</p>
          </Link>
        );
      })}
    </>
  );
}

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
    return <div className="aspect-[4/5] w-full bg-muted/60 animate-pulse" />;
  }

  if (event) {
    return (
      <Link
        href="/events"
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
      })}
    </>
  );
}

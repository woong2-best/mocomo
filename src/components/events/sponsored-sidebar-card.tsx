"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import Link from "next/link";
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

const PLACEHOLDER_AD = "/ads/your-ad-here.jpg";

/** Fills the fixed 442/684 frame. contain keeps the whole image, never cropped. */
const AD_SLOT_CLASS = "block h-full w-full object-contain";

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
    <div className="h-full w-full overflow-hidden">
      {hasSponsorEvent ? (
        <SponsorAdClickLink
          linkUrl={event.linkUrl}
          className="group relative block h-full w-full hover:opacity-95 transition-opacity"
          aria-label={event.title || t("sidebar.sponsored")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.imageUrl} alt="" className={AD_SLOT_CLASS} draggable={false} />
        </SponsorAdClickLink>
      ) : (
        <Link
          href="/events/new"
          className="block h-full w-full transition-opacity hover:opacity-95"
          aria-label="Your Ad Here"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PLACEHOLDER_AD} alt="Your Ad Here" className={AD_SLOT_CLASS} draggable={false} />
        </Link>
      )}
    </div>
  );
}

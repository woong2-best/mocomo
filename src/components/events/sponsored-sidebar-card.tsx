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
  const isPost = event?.kind === "post" || Boolean(event?.postId);
  const cta = event?.ctaLabel?.trim() || (isPost ? t("post.boost.viewPost") : t("sidebar.sponsored"));
  const author = event?.authorName?.trim();
  const excerpt = event?.excerpt?.trim() || event?.title?.trim();

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
      {hasSponsorEvent ? (
        <SponsorAdClickLink
          linkUrl={event.linkUrl}
          className="group relative block h-full w-full"
          aria-label={event.title || t("sidebar.sponsored")}
        >
          <SponsorBlurCard imageUrl={event.imageUrl} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10">
            {author ? (
              <p className="truncate text-[11px] font-semibold text-white/90">{author}</p>
            ) : null}
            {excerpt ? (
              <p className="mt-0.5 truncate text-[12px] leading-snug text-white/80">{excerpt}</p>
            ) : null}
            <span className="mt-2 inline-flex rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-folk-cobalt shadow-sm">
              {cta}
            </span>
          </div>
        </SponsorAdClickLink>
      ) : (
        <Link
          href="/events/new"
          className="block h-full w-full transition-opacity hover:opacity-95"
          aria-label="Your Ad Here"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PLACEHOLDER_AD} alt="Your Ad Here" className="h-full w-full object-cover" draggable={false} />
        </Link>
      )}
    </div>
  );
}

function SponsorBlurCard({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: "blur(20px)" }}
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/30" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="relative h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

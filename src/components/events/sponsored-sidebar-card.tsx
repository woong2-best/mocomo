"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { SponsorAdClickLink } from "@/components/events/sponsor-ad-click-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SponsorSpotEvent } from "@/lib/sponsor-spot-server";

type SidebarAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string | null;
};

/** Survive layout remounts so navigation does not rotate/reload the creative. */
let sessionSponsorEvent: SponsorSpotEvent | null = null;

export function SponsoredSidebarCard({
  sidebarAds: _sidebarAds,
  initialSponsorEvent = null,
}: {
  sidebarAds: SidebarAd[];
  initialSponsorEvent?: SponsorSpotEvent | null;
}) {
  const { t } = useLocale();
  const [event, setEvent] = useState<SponsorSpotEvent | null>(
    () => initialSponsorEvent ?? sessionSponsorEvent
  );

  useEffect(() => {
    if (!initialSponsorEvent) return;
    sessionSponsorEvent = initialSponsorEvent;
    setEvent(initialSponsorEvent);
  }, [initialSponsorEvent]);

  useEffect(() => {
    if (sessionSponsorEvent || initialSponsorEvent) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/events/sponsor-spot", { credentials: "same-origin" });
        const body = await res.json();
        if (!cancelled && body.event) {
          sessionSponsorEvent = body.event;
          setEvent(body.event);
        }
      } catch {
        /* keep empty slot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSponsorEvent]);

  const hasSponsorEvent = event != null;
  const author = event?.authorName?.trim();
  const authorUsername = event?.authorUsername?.trim();
  const authorInitial = (author || authorUsername || "?").slice(0, 1).toUpperCase();
  const profileHref = authorUsername ? `/u/${authorUsername}` : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/40">
      {hasSponsorEvent ? (
        <>
          <SponsorAdClickLink
            linkUrl={event.linkUrl}
            className="group absolute inset-0 block"
            aria-label={event.title || t("sidebar.sponsored")}
          >
            <SponsorBlurCard imageUrl={event.imageUrl} />
          </SponsorAdClickLink>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2.5 pb-2.5 pt-10">
            {profileHref ? (
              <Link
                href={profileHref}
                className="pointer-events-auto inline-flex max-w-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label={author || authorUsername}
                onClick={(e) => e.stopPropagation()}
              >
                <AdAuthorCredit
                  image={event.authorImage}
                  name={author}
                  initial={authorInitial}
                />
              </Link>
            ) : (
              <AdAuthorCredit
                image={event.authorImage}
                name={author}
                initial={authorInitial}
              />
            )}
          </div>
        </>
      ) : (
        <Link
          href="/events/new"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/50 text-center transition-opacity hover:opacity-95"
          aria-label="Your Ad Here"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("sidebar.sponsored")}
          </span>
          <span className="text-xs text-muted-foreground/80">Your Ad Here</span>
        </Link>
      )}
    </div>
  );
}

function AdAuthorCredit({
  image,
  name,
  initial,
}: {
  image?: string | null;
  name?: string;
  initial: string;
}) {
  return (
    <span className="flex max-w-full items-center gap-1.5">
      <Avatar className="h-6 w-6 ring-1 ring-white/85 ring-offset-0">
        <AvatarImage src={image} alt={name || ""} />
        <AvatarFallback className="text-[9px]">{initial}</AvatarFallback>
      </Avatar>
      {name ? (
        <span className="min-w-0 truncate text-[11px] font-semibold text-white drop-shadow">{name}</span>
      ) : null}
    </span>
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
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

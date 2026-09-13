"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeSidebarAdTitle } from "@/lib/sidebar-ad-i18n";
import { sanitizeAdLink, isExternalUrl } from "@/lib/safe-link";

type SidebarAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string | null;
};

type SponsorEvent = { id: string; title: string; imageUrl: string };

export function SponsoredSidebarCard({ sidebarAds }: { sidebarAds: SidebarAd[] }) {
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

  if (!loaded) return null;
  if (!event && sidebarAds.length === 0) return null;

  return (
    <Card className="overflow-hidden border-folk-gold/40 bg-folk-gold/5">
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
        {event ? (
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
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

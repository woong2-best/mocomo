"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, MapPin } from "lucide-react";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getSubcultureMapDefaultView,
  resolveSubculturePinsForUser,
  selectSidebarEventPins,
} from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-events";
import { cn } from "@/lib/utils";

const ESRI_ATTRIBUTION_URL = "https://www.esri.com/";

function MapAttributionButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        aria-label="지도 타일 저작권 정보"
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[9.5rem] rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-[11px] leading-snug text-foreground shadow-lg"
          role="dialog"
          aria-label="지도 저작권"
        >
          <a
            href={ESRI_ATTRIBUTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-2 hover:underline"
          >
            Tiles © Esri
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarEventMapCard({
  pins,
  className,
}: {
  pins: MapEventPin[];
  className?: string;
}) {
  const { countryCode, t } = useLocale();
  const mapPins = useMemo(
    () =>
      selectSidebarEventPins(resolveSubculturePinsForUser(pins, countryCode)),
    [pins, countryCode]
  );
  const defaultView = getSubcultureMapDefaultView(countryCode);

  return (
    <Card
      className={cn(
        "rounded-2xl border-violet-500/20 bg-card/95 shadow-sm overflow-hidden flex flex-col min-h-0",
        className
      )}
    >
      <CardHeader className="pb-2 pt-3 px-3 shrink-0 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-1.5 font-semibold text-violet-600 dark:text-violet-400">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("sidebar.eventsMapTitle")}</span>
          </CardTitle>
          <MapAttributionButton />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-0 gap-0">
        <div className="px-3 pb-2 shrink-0">
          <SubcultureEventsMapLazy
            pins={mapPins}
            heightClassName="h-40 sm:h-44"
            interactive
            showNavigationControls={false}
            showAttribution={false}
            defaultView={defaultView}
            className="subculture-events-map--sidebar"
          />
        </div>

        <div className="mt-auto shrink-0 border-t border-border/50 px-3 py-2.5">
          <Link
            href="/events/map"
            className="flex w-full items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/8 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            {t("sidebar.eventsMapExpand")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";
const i18n = createTranslator("en");


import { createTranslator } from "@/lib/i18n/messages";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
        className="map-glass-control map-glass-icon-btn"
        aria-label={i18n("events.s32iang")}
        aria-expanded={open}
      >
        <span aria-hidden className="font-serif">
          i
        </span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[9.5rem] rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-[11px] leading-snug text-foreground shadow-lg"
          role="dialog"
          aria-label={i18n("events.scrqozj")}
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
  fillHeight = false,
}: {
  pins: MapEventPin[];
  className?: string;
  /** 부모 높이에 맞춰 지도만 세로로 늘림 (광고는 고정) */
  fillHeight?: boolean;
}) {
  const { countryCode } = useLocale();
  const mapPins = useMemo(
    () =>
      selectSidebarEventPins(resolveSubculturePinsForUser(pins, countryCode)),
    [pins, countryCode]
  );
  const defaultView = getSubcultureMapDefaultView(countryCode);

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden",
        fillHeight ? "absolute inset-0 h-full min-h-0" : "shrink-0",
        className
      )}
    >
      <SubcultureEventsMapLazy
        pins={mapPins}
        heightClassName={fillHeight ? "h-full w-full" : "aspect-[4/5] w-full"}
        interactive
        showNavigationControls={false}
        showAttribution={false}
        defaultView={defaultView}
        pinHalo
        className="subculture-events-map--sidebar h-full w-full rounded-none border-0"
      />
      <div className="pointer-events-none absolute inset-x-0 top-2.5 z-30 px-2.5">
        <div className="relative flex items-center justify-end">
          <Link
            href="/events/map"
            className="map-glass-control map-glass-pill pointer-events-auto absolute left-1/2 -translate-x-1/2"
          >
            {i18n("sidebar.eventsMapExpand")}
          </Link>
          <MapAttributionButton className="pointer-events-auto" />
        </div>
      </div>
    </div>
  );
}

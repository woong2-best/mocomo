"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubcultureEventPinCard } from "@/components/events/subculture-event-pin-card";
import { EventsMapSpaceDecor } from "@/components/events/events-map-space-decor";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { getSubcultureGlobeInitialView } from "@/lib/subculture-event-countries";
import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

function MapOverlayChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-black/45 backdrop-blur-md shadow-lg text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

function EventsMapPinList({
  eventPins,
  className,
}: {
  eventPins: MapEventPin[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "events-map-overlay pointer-events-auto flex flex-col min-h-0 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md shadow-2xl",
        className
      )}
    >
      <h2 className="shrink-0 px-3 pt-3 pb-2 text-xs font-semibold text-white/80 border-b border-white/10">
        다가오는 행사 ({eventPins.length})
      </h2>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 subculture-sidebar-scroll">
        {eventPins.length === 0 ? (
          <Card className="rounded-xl bg-white/5 border-white/10 text-white">
            <CardContent className="p-6 text-center text-white/70 text-sm">
              등록된 행사가 없습니다.
            </CardContent>
          </Card>
        ) : (
          eventPins.map((p) => <SubcultureEventPinCard key={p.id} pin={p} variant="sidebar" />)
        )}
      </div>
    </div>
  );
}

export function EventsMapView({
  initialPins,
  eventCountry: _eventCountry,
}: {
  initialPins: MapEventPin[];
  eventCountry: SubcultureEventCountry;
}) {
  const { countryCode } = useLocale();

  const globeInitialView = useMemo(
    () => getSubcultureGlobeInitialView(countryCode),
    [countryCode]
  );

  const eventPins = useMemo(
    () => initialPins.filter((p) => p.category !== "maid_cafe"),
    [initialPins]
  );

  return (
    <div className="events-map-immersive relative h-full w-full min-h-0 bg-[#020208]">
      <EventsMapSpaceDecor />

      <div className="absolute inset-0 z-[1] isolate">
        <SubcultureEventsMapLazy
          pins={eventPins}
          immersive
          interactive
          defaultView={globeInitialView}
          respectDefaultView
        />
      </div>

      {/* Title — top-left chip on globe */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
        <MapOverlayChip className="pointer-events-auto px-3 py-2 sm:px-4 sm:py-2.5">
          <h1 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-300 shrink-0" />
            <span>서브컬처·애니 행사 지도</span>
          </h1>
        </MapOverlayChip>
      </div>

      {/* Desktop — scrollable events only */}
      <div className="hidden lg:flex absolute top-4 right-4 bottom-4 z-20 w-72 xl:w-80 pointer-events-none">
        <EventsMapPinList eventPins={eventPins} className="w-full" />
      </div>

      {/* Mobile — bottom scrollable events */}
      <div className="lg:hidden absolute inset-x-0 bottom-0 z-20 p-3 pb-safe pointer-events-none">
        <EventsMapPinList
          eventPins={eventPins}
          className="max-h-[min(42vh,320px)]"
        />
      </div>
    </div>
  );
}

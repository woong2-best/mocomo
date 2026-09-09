"use client";

import { useMemo, useState } from "react";
import { Globe, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubcultureEventPinCard } from "@/components/events/subculture-event-pin-card";
import { EventsMapSpaceDecor } from "@/components/events/events-map-space-decor";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import {
  getSubcultureMapDefaultView,
  resolveSubculturePinsForUser,
  type SubcultureEventCountry,
} from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const GLOBAL_MAP_VIEW = { lat: 20, lng: 10, zoom: 1.4 };

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
  const [globalMode, setGlobalMode] = useState(true);

  const localDefaultView = useMemo(
    () => getSubcultureMapDefaultView(countryCode),
    [countryCode]
  );

  const pins = useMemo(
    () =>
      globalMode
        ? initialPins
        : resolveSubculturePinsForUser(initialPins, countryCode).slice(0, 200),
    [globalMode, initialPins, countryCode]
  );
  const eventPins = useMemo(
    () => pins.filter((p) => p.category !== "maid_cafe"),
    [pins]
  );
  const mapView = globalMode ? GLOBAL_MAP_VIEW : localDefaultView;

  function toggleGlobal() {
    setGlobalMode((v) => !v);
  }

  return (
    <div className="events-map-immersive relative h-full w-full min-h-0 bg-[#020208]">
      <EventsMapSpaceDecor />

      <div className="absolute inset-0 z-[1] isolate">
        <SubcultureEventsMapLazy
          pins={eventPins}
          immersive
          interactive
          defaultView={mapView}
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

      {/* Globe toggle — top-right */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 pointer-events-auto">
        <button
          type="button"
          aria-pressed={globalMode}
          aria-label={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
          title={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
          onClick={toggleGlobal}
          className={cn(
            "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border backdrop-blur-md shadow-lg transition-colors",
            globalMode
              ? "bg-violet-500/90 text-white border-violet-400/80"
              : "bg-black/45 text-white/85 border-white/15 hover:bg-black/55 hover:text-white"
          )}
        >
          <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {/* Desktop — scrollable events only (replaces shell right panel on this page) */}
      <div className="hidden lg:flex absolute top-16 right-4 bottom-4 z-20 w-72 xl:w-80 pointer-events-none">
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

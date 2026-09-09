"use client";

import { useCallback, useMemo, useState } from "react";
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
import {
  SUBCULTURE_EVENT_CATEGORY_COLORS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
} from "@/lib/subculture-event-types";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const GLOBAL_MAP_VIEW = { lat: 20, lng: 10, zoom: 1.4 };
/** Whole-globe view only — any zoom-in removes Mars HUD decor immediately */
const MARS_DECOR_MAX_ZOOM = 2.2;

const LEGEND_CATEGORIES = [
  "comic",
  "anime",
  "cosplay",
  "goods",
  "maid_cafe",
  "other",
] as const;

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

export function EventsMapView({
  initialPins,
  eventCountry: _eventCountry,
}: {
  initialPins: MapEventPin[];
  eventCountry: SubcultureEventCountry;
}) {
  const { countryCode } = useLocale();
  const [globalMode, setGlobalMode] = useState(true);
  const [mapZoom, setMapZoom] = useState(GLOBAL_MAP_VIEW.zoom);
  const marsDecorVisible = mapZoom <= MARS_DECOR_MAX_ZOOM;

  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);

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
  const maidPins = useMemo(
    () => pins.filter((p) => p.category === "maid_cafe"),
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
          pins={pins}
          immersive
          interactive
          defaultView={mapView}
          onZoomChange={handleZoomChange}
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

      {/* Legend — individual chips below title */}
      <div className="absolute top-[3.25rem] sm:top-[3.75rem] left-3 sm:left-4 z-20 flex flex-wrap gap-1.5 sm:gap-2 max-w-[calc(100%-4.5rem)] pointer-events-none">
        {LEGEND_CATEGORIES.map((key) => (
          <MapOverlayChip
            key={key}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] text-white/90"
          >
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0 ring-1 ring-white/30"
              style={{ background: SUBCULTURE_EVENT_CATEGORY_COLORS[key] }}
              aria-hidden
            />
            {SUBCULTURE_EVENT_CATEGORY_LABELS[key]}
          </MapOverlayChip>
        ))}
      </div>

      {/* Mars — HUD corner decor (not a map layer; unmounts on zoom-in) */}
      {marsDecorVisible ? (
        <div
          className="events-map-mars-hud absolute top-[4.5rem] right-4 sm:top-[5rem] sm:right-5 z-[15] pointer-events-none"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/events/mars-decor.png"
            alt=""
            className="events-map-mars-img"
            width={88}
            height={88}
            decoding="async"
            draggable={false}
          />
        </div>
      ) : null}

      {/* Globe toggle — top-right inside map area */}
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

      <div className="lg:hidden absolute inset-x-0 bottom-0 z-20 p-3 pb-safe pointer-events-none">
        <div className="events-map-overlay pointer-events-auto max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md shadow-2xl p-3 space-y-3">
          <h2 className="text-xs font-semibold text-white/80 sticky top-0 bg-black/55 backdrop-blur-sm py-1">
            다가오는 행사
          </h2>
          {eventPins.length === 0 ? (
            <Card className="rounded-xl bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 text-center text-white/70 text-sm">
                등록된 행사가 없습니다.
              </CardContent>
            </Card>
          ) : (
            eventPins.map((p) => <SubcultureEventPinCard key={p.id} pin={p} />)
          )}
          {maidPins.length > 0 && (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold text-pink-300">
                메이드 카페 · 상설 ({maidPins.length})
              </h3>
              {maidPins.map((p) => (
                <SubcultureEventPinCard key={p.id} pin={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

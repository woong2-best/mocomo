"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubcultureEventPinCard } from "@/components/events/subculture-event-pin-card";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import {
  getSubcultureMapDefaultView,
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

const LEGEND_CATEGORIES = [
  "comic",
  "anime",
  "cosplay",
  "goods",
  "maid_cafe",
  "other",
] as const;

export function EventsMapView({
  initialPins,
  eventCountry: _eventCountry,
}: {
  initialPins: MapEventPin[];
  eventCountry: SubcultureEventCountry;
}) {
  const { countryCode } = useLocale();
  const [globalMode, setGlobalMode] = useState(false);
  const [globalPins, setGlobalPins] = useState<MapEventPin[] | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  const localDefaultView = useMemo(
    () => getSubcultureMapDefaultView(countryCode),
    [countryCode]
  );

  const loadGlobalPins = useCallback(async () => {
    setLoadingGlobal(true);
    try {
      const res = await fetch("/api/events/map?global=1", { credentials: "same-origin" });
      const data = (await res.json()) as { pins?: MapEventPin[] };
      setGlobalPins(Array.isArray(data.pins) ? data.pins : []);
    } catch {
      setGlobalPins([]);
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  useEffect(() => {
    if (globalMode && globalPins === null) {
      void loadGlobalPins();
    }
  }, [globalMode, globalPins, loadGlobalPins]);

  const pins = globalMode ? (globalPins ?? []) : initialPins;
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
    <div className="events-map-immersive relative h-full w-full min-h-0">
      <div className="absolute inset-0 z-0">
        {loadingGlobal && globalMode ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80 bg-black">
            전 세계 행사 불러오는 중…
          </div>
        ) : (
          <SubcultureEventsMapLazy
            pins={pins}
            immersive
            interactive
            defaultView={mapView}
          />
        )}
      </div>

      <div className="absolute inset-x-0 top-0 z-20 p-3 sm:p-4 lg:p-5 pointer-events-none">
        <div className="events-map-overlay pointer-events-auto max-w-2xl rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md shadow-xl px-3 py-3 sm:px-4 sm:py-4 text-white">
          <Link href="/events">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 -ml-2 mb-1 h-8 text-white/90 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              이벤트
            </Button>
          </Link>
          <div className="flex items-start gap-2">
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="h-6 w-6 text-violet-300 shrink-0" />
              <span className="min-w-0">서브컬처·애니 행사 지도</span>
            </h1>
            <button
              type="button"
              aria-pressed={globalMode}
              aria-label={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
              title={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
              onClick={toggleGlobal}
              className={cn(
                "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                globalMode
                  ? "bg-violet-500 text-white border-violet-400 shadow-sm"
                  : "bg-white/10 text-white/80 border-white/20 hover:bg-white/15 hover:text-white"
              )}
            >
              <Globe className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-white/75">
            {LEGEND_CATEGORIES.map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0 ring-1 ring-white/30"
                  style={{ background: SUBCULTURE_EVENT_CATEGORY_COLORS[key] }}
                  aria-hidden
                />
                {SUBCULTURE_EVENT_CATEGORY_LABELS[key]}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lg:hidden absolute inset-x-0 bottom-0 z-20 p-3 pb-safe pointer-events-none">
        <div className="events-map-overlay pointer-events-auto max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md shadow-2xl p-3 space-y-3">
          <h2 className="text-xs font-semibold text-white/80 sticky top-0 bg-black/55 backdrop-blur-sm py-1">
            다가오는 행사
          </h2>
          {eventPins.length === 0 ? (
            <Card className="rounded-xl bg-white/5 border-white/10 text-white">
              <CardContent className="p-6 text-center text-white/70 text-sm">
                {loadingGlobal ? "불러오는 중…" : "등록된 행사가 없습니다."}
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

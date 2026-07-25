"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ExternalLink, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { NativePageTitle } from "@/components/layout/app-page-chrome";
import {
  eventCountryFlag,
  getSubcultureMapDefaultView,
  SUBCULTURE_EVENT_COUNTRY_LABELS,
  subcultureCountrySummary,
  type SubcultureEventCountry,
} from "@/lib/subculture-event-countries";
import {
  SUBCULTURE_EVENT_CATEGORY_COLORS,
  SUBCULTURE_EVENT_CATEGORY_LABELS,
} from "@/lib/subculture-event-types";
import { mapLinkForEvent, type MapEventPin } from "@/lib/subculture-event-pins";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const GLOBAL_MAP_VIEW = { lat: 28, lng: 135, zoom: 3 };

const LEGEND_CATEGORIES = [
  "comic",
  "anime",
  "cosplay",
  "goods",
  "maid_cafe",
  "other",
] as const;

function PinListCard({ p }: { p: MapEventPin }) {
  const mapLink = mapLinkForEvent(p);
  const isMaid = p.category === "maid_cafe";
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-2 flex-wrap">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                background:
                  SUBCULTURE_EVENT_CATEGORY_COLORS[p.category] ??
                  SUBCULTURE_EVENT_CATEGORY_COLORS.other,
              }}
              aria-hidden
            />
            <span>{eventCountryFlag(p.country)}</span>
            {p.title}
          </p>
          {p.description && (
            <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {isMaid ? (
              <span className="text-pink-500 font-medium">상설 영업</span>
            ) : (
              <>
                {format(new Date(p.startsAt), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                {p.endsAt &&
                  ` — ${format(new Date(p.endsAt), "M월 d일", { locale: ko })}`}
              </>
            )}
          </p>
          {p.venueName && <p className="text-sm mt-1">📍 {p.venueName}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={mapLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            {mapLink.label}
            <ExternalLink className="h-3 w-3" />
          </a>
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
            >
              공식
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventsMapView({
  initialPins,
  eventCountry,
}: {
  initialPins: MapEventPin[];
  eventCountry: SubcultureEventCountry;
}) {
  const { countryCode, locale } = useLocale();
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
  const summary = globalMode
    ? "🌐 전 세계 서브컬처·애니 행사"
    : subcultureCountrySummary(countryCode, locale);

  function toggleGlobal() {
    setGlobalMode((v) => !v);
  }

  return (
    <>
      <div>
        <Link href="/events">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2">
            <ChevronLeft className="h-4 w-4" />
            이벤트
          </Button>
        </Link>
        <NativePageTitle>
          <div className="flex items-start gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2 min-w-0 flex-1">
              <MapPin className="h-7 w-7 text-violet-500 shrink-0" />
              <span className="min-w-0">서브컬처·애니 행사 지도</span>
            </h1>
            <button
              type="button"
              aria-pressed={globalMode}
              aria-label={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
              title={globalMode ? "내 국가 행사만 보기" : "전 세계 행사 보기"}
              onClick={toggleGlobal}
              className={cn(
                "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors",
                globalMode
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Globe className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {summary} · 매일 cron 갱신
          </p>
        </NativePageTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {globalMode ? (
            <>🌐 전 세계 행사 표시 중 · 지구본을 다시 누르면 내 국가만</>
          ) : (
            <>
              {eventCountryFlag(eventCountry)} {SUBCULTURE_EVENT_COUNTRY_LABELS[eventCountry]} 기준 · 설정에서
              국가 변경 가능
            </>
          )}
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          {LEGEND_CATEGORIES.map((key) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: SUBCULTURE_EVENT_CATEGORY_COLORS[key] }}
                aria-hidden
              />
              {SUBCULTURE_EVENT_CATEGORY_LABELS[key]}
            </li>
          ))}
        </ul>
      </div>

      {loadingGlobal && globalMode ? (
        <div className="h-[min(420px,55vh)] rounded-xl border border-border/60 flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
          전 세계 행사 불러오는 중…
        </div>
      ) : (
        <SubcultureEventsMapLazy
          pins={pins}
          heightClassName="h-[min(420px,55vh)]"
          interactive
          defaultView={mapView}
        />
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">다가오는 행사</h2>
        {eventPins.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {loadingGlobal ? "불러오는 중…" : "등록된 행사가 없습니다."}
            </CardContent>
          </Card>
        ) : (
          eventPins.map((p) => <PinListCard key={p.id} p={p} />)
        )}
      </div>

      {maidPins.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-pink-500">
            메이드 카페 · 상설 ({maidPins.length})
          </h2>
          {maidPins.map((p) => (
            <PinListCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

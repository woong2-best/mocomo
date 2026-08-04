"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentCoords, geolocationErrorMessage } from "@/lib/client-geolocation";
import { selectMapEngine } from "@/lib/maps/select-engine";
import type { MapEngineId, MeetCoords } from "@/lib/maps/types";
import { getRegionMapCenter, isShippingOnlyRegion } from "@/lib/used-region-coords";
import { getKakaoJsKey } from "@/components/maps/kakao-maps-loader";
import { cn } from "@/lib/utils";

const KakaoMeetMapCanvas = dynamic(
  () => import("@/components/maps/KakaoMeetMapCanvas").then((m) => m.KakaoMeetMapCanvas),
  { ssr: false }
);
const MapLibreMeetMapCanvas = dynamic(
  () => import("@/components/maps/MapLibreMeetMapCanvas").then((m) => m.MapLibreMeetMapCanvas),
  { ssr: false }
);

export type MeetMapViewProps = {
  mode: "view" | "pick";
  country: string;
  region: string;
  meetPlace?: string;
  coords?: MeetCoords | null;
  onCoordsChange?: (coords: MeetCoords | null) => void;
  onMeetPlaceChange?: (text: string) => void;
  className?: string;
  heightClassName?: string;
};

function resolveDisplayEngine(country: string): MapEngineId {
  const preferred = selectMapEngine(country);
  if (preferred === "kakao" && !getKakaoJsKey()) {
    // Kakao Local geocode still works via REST key; map tiles fall back to MapLibre.
    return "maplibre";
  }
  return preferred;
}

export function MeetMapView({
  mode,
  country,
  region,
  meetPlace = "",
  coords,
  onCoordsChange,
  onMeetPlaceChange,
  className,
  heightClassName = "h-52",
}: MeetMapViewProps) {
  const preferredEngine = selectMapEngine(country);
  const [engine, setEngine] = useState<MapEngineId>(() => resolveDisplayEngine(country));
  const shipping = isShippingOnlyRegion(region);
  const interactive = mode === "pick" && !shipping;

  const [searchQ, setSearchQ] = useState(meetPlace);
  const [searching, setSearching] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [mapError, setMapError] = useState("");
  const [displayCoords, setDisplayCoords] = useState<MeetCoords | null>(coords ?? null);
  const activeCoords = coords ?? displayCoords;

  const regionCenter = useMemo(() => getRegionMapCenter(region), [region]);
  const center = activeCoords ?? { lat: regionCenter.lat, lng: regionCenter.lng };
  const zoom = activeCoords ? 16 : regionCenter.zoom;

  useEffect(() => {
    setEngine(resolveDisplayEngine(country));
    setMapError("");
  }, [country]);

  useEffect(() => {
    setSearchQ(meetPlace);
  }, [meetPlace]);

  useEffect(() => {
    setDisplayCoords(coords ?? null);
  }, [coords]);

  const resolvePinAddress = useCallback(
    async (lat: number, lng: number, detail?: string) => {
      try {
        const res = await fetch(
          `/api/used/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&country=${encodeURIComponent(country)}`
        );
        const body = (await res.json()) as { label?: string; error?: string; code?: string };
        if (body.code === "KAKAO_NOT_CONFIGURED") {
          setResolveError("서버에 KAKAO_REST_API_KEY를 설정해 주세요.");
          return;
        }
        if (res.ok && body.label) {
          onMeetPlaceChange?.(detail?.trim() ? `${body.label} · ${detail.trim()}` : body.label);
          setResolveError("");
        }
      } catch {
        /* keep coords */
      }
    },
    [country, onMeetPlaceChange]
  );

  const handlePick = useCallback(
    (next: MeetCoords) => {
      if (!interactive) return;
      onCoordsChange?.(next);
      setDisplayCoords(next);
      void resolvePinAddress(next.lat, next.lng);
    },
    [interactive, onCoordsChange, resolvePinAddress]
  );

  const handleMapEngineError = useCallback(
    (message: string) => {
      if (engine === "kakao") {
        setEngine("maplibre");
        setMapError("카카오맵 스크립트가 차단되어 OpenStreetMap으로 표시합니다.");
        return;
      }
      setMapError(message || "지도를 불러오지 못했습니다.");
    },
    [engine]
  );

  const handleMapReady = useCallback(() => {
    setMapError("");
  }, []);

  useEffect(() => {
    if (mode !== "view" || shipping || coords) return;
    if (!meetPlace?.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({ region, place: meetPlace, country });
        const res = await fetch(`/api/used/geocode?${params}`);
        const body = (await res.json()) as {
          lat?: number;
          lng?: number;
          code?: string;
        };
        if (cancelled) return;
        if (body.code === "KAKAO_NOT_CONFIGURED") {
          setResolveError("서버에 KAKAO_REST_API_KEY를 설정해 주세요.");
          return;
        }
        if (!res.ok || body.lat == null || body.lng == null) return;
        setDisplayCoords({ lat: body.lat, lng: body.lng });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, region, meetPlace, coords, shipping, country]);

  async function searchPlace() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setResolveError("");
    try {
      const params = new URLSearchParams({ region, place: q, country });
      const res = await fetch(`/api/used/geocode?${params}`);
      const body = (await res.json()) as {
        lat?: number;
        lng?: number;
        label?: string;
        error?: string;
        code?: string;
      };
      if (body.code === "KAKAO_NOT_CONFIGURED") {
        setResolveError("서버에 KAKAO_REST_API_KEY를 설정해 주세요.");
        return;
      }
      if (!res.ok || body.lat == null || body.lng == null) {
        setResolveError(body.error ?? "장소를 찾지 못했습니다.");
        return;
      }
      const next = { lat: body.lat, lng: body.lng };
      onCoordsChange?.(next);
      onMeetPlaceChange?.(body.label?.trim() || q);
      setDisplayCoords(next);
    } catch {
      setResolveError("검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }

  async function fetchCurrentLocation() {
    setResolveError("");
    try {
      const c = await getCurrentCoords();
      const next = { lat: c.lat, lng: c.lng };
      onCoordsChange?.(next);
      setDisplayCoords(next);
      void resolvePinAddress(next.lat, next.lng);
    } catch (err) {
      setResolveError(geolocationErrorMessage(err));
    }
  }

  if (shipping) {
    return (
      <p className="text-xs text-muted-foreground rounded-xl border border-dashed p-4 text-center">
        전국 택배 거래는 지도 표시 없이 택배로 진행해 주세요.
      </p>
    );
  }

  const Canvas = engine === "kakao" ? KakaoMeetMapCanvas : MapLibreMeetMapCanvas;
  const searchPlaceholder =
    preferredEngine === "kakao"
      ? "카카오맵 장소 검색 (예: 강남역 2번 출구)"
      : "Search place (OpenStreetMap)";

  return (
    <div className={cn("space-y-2", className)}>
      {mode === "pick" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="rounded-xl h-10 text-sm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void searchPlace())}
            />
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl shrink-0"
              disabled={searching}
              onClick={() => void searchPlace()}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1 shrink-0"
            onClick={() => void fetchCurrentLocation()}
          >
            <Navigation className="h-3.5 w-3.5" />
            내 위치
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative rounded-xl overflow-hidden border border-border bg-muted/20",
          heightClassName
        )}
      >
        <Canvas
          key={engine}
          mode={mode}
          center={center}
          zoom={zoom}
          marker={activeCoords}
          onPick={interactive ? handlePick : undefined}
          onError={handleMapEngineError}
          onReady={handleMapReady}
        />
        {!activeCoords && mode === "pick" && (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
            <p className="text-[11px] text-center px-2 py-1 rounded-lg bg-background/90 border shadow-sm">
              지도를 탭하거나 검색해서 거래 장소 핀을 찍어 주세요
            </p>
          </div>
        )}
      </div>

      {(resolveError || mapError) && (
        <p className="text-xs text-destructive">{resolveError || mapError}</p>
      )}

      {mode === "pick" && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {preferredEngine === "kakao"
            ? engine === "kakao"
              ? "한국은 카카오맵으로 검색·표시됩니다. 핀을 옮기면 장소명이 자동으로 채워져요."
              : "장소 검색은 카카오 로컬 API, 지도 표시는 OpenStreetMap(MapLibre)입니다."
            : "이 국가는 MapLibre + OpenStreetMap으로 검색·표시됩니다."}
        </p>
      )}
    </div>
  );
}

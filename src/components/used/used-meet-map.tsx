"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { getRegionMapCenter, isShippingOnlyRegion } from "@/lib/used-region-coords";
import type { MeetCoords } from "@/lib/used-market";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import "leaflet/dist/leaflet.css";

type UsedMeetMapProps = {
  mode: "view" | "pick";
  region: string;
  meetPlace?: string;
  coords?: MeetCoords | null;
  onCoordsChange?: (coords: MeetCoords | null) => void;
  onMeetPlaceChange?: (text: string) => void;
  className?: string;
  heightClassName?: string;
};

function makePinIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "used-meet-pin-icon",
    html: `<div style="width:32px;height:32px;background:#ef4444;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 10px rgba(0,0,0,.4);margin-left:-16px;margin-top:-32px"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

export function UsedMeetMap({
  mode,
  region,
  meetPlace = "",
  coords,
  onCoordsChange,
  onMeetPlaceChange,
  className,
  heightClassName = "h-52",
}: UsedMeetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState(meetPlace);
  const [searching, setSearching] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [displayCoords, setDisplayCoords] = useState<MeetCoords | null>(coords ?? null);

  const shipping = isShippingOnlyRegion(region);
  const interactive = mode === "pick" && !shipping;
  const activeCoords = coords ?? displayCoords;

  useEffect(() => {
    setSearchQ(meetPlace);
  }, [meetPlace]);

  const resolvePinAddress = useCallback(
    async (lat: number, lng: number, detail?: string) => {
      try {
        const res = await fetch(
          `/api/used/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
        );
        const body = (await res.json()) as {
          label?: string;
          error?: string;
          code?: string;
        };
        if (body.code === "KAKAO_NOT_CONFIGURED") {
          setResolveError("서버에 KAKAO_REST_API_KEY를 설정해 주세요.");
          return;
        }
        if (res.ok && body.label) {
          onMeetPlaceChange?.(detail?.trim() ? `${body.label} · ${detail.trim()}` : body.label);
          setResolveError("");
        }
      } catch {
        /* 주소 자동 입력 실패해도 좌표는 유지 */
      }
    },
    [onMeetPlaceChange]
  );

  const applyPin = useCallback(
    (lat: number, lng: number, L: typeof import("leaflet"), withReverse = false) => {
      const map = mapRef.current;
      if (!map) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], {
          icon: makePinIcon(L),
          draggable: interactive,
        }).addTo(map);
        if (interactive) {
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current?.getLatLng();
            if (!pos) return;
            const next = { lat: pos.lat, lng: pos.lng };
            onCoordsChange?.(next);
            setDisplayCoords(next);
            void resolvePinAddress(next.lat, next.lng);
          });
        }
      }
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
      if (withReverse && interactive) void resolvePinAddress(lat, lng);
    },
    [interactive, onCoordsChange, resolvePinAddress]
  );

  const placeMarker = useCallback(
    (lat: number, lng: number, L: typeof import("leaflet"), withReverse = false) => {
      applyPin(lat, lng, L, withReverse);
    },
    [applyPin]
  );

  const initMap = useCallback(async () => {
    if (!containerRef.current || shipping) {
      setLoading(false);
      return;
    }
    const L = await import("leaflet");
    leafletRef.current = L;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }

    const center = getRegionMapCenter(region);
    const initial = coords ?? null;
    const start = initial ?? { lat: center.lat, lng: center.lng };

    const map = L.map(containerRef.current, {
      center: [start.lat, start.lng],
      zoom: initial ? 16 : center.zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    if (initial) placeMarker(initial.lat, initial.lng, L);

    if (interactive) {
      map.on("click", (e) => {
        const next = { lat: e.latlng.lat, lng: e.latlng.lng };
        onCoordsChange?.(next);
        setDisplayCoords(next);
        placeMarker(next.lat, next.lng, L, true);
      });
    }

    setLoading(false);
  }, [region, shipping, interactive, coords, placeMarker, onCoordsChange]);

  useEffect(() => {
    setLoading(true);
    void initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initMap]);

  useEffect(() => {
    setDisplayCoords(coords ?? null);
    const L = leafletRef.current;
    if (coords && L && mapRef.current) {
      placeMarker(coords.lat, coords.lng, L);
    }
  }, [coords, placeMarker]);

  useEffect(() => {
    if (mode !== "view" || shipping || coords) return;
    if (!meetPlace?.trim()) return;
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({ region, place: meetPlace });
        const res = await fetch(`/api/used/geocode?${params}`);
        const body = (await res.json()) as {
          lat?: number;
          lng?: number;
          error?: string;
          code?: string;
        };
        if (cancelled) return;
        if (body.code === "KAKAO_NOT_CONFIGURED") {
          setResolveError("서버에 KAKAO_REST_API_KEY를 설정해 주세요.");
          return;
        }
        if (!res.ok || body.lat == null || body.lng == null) return;
        const next = { lat: body.lat, lng: body.lng };
        setDisplayCoords(next);
        const L = leafletRef.current;
        if (L && mapRef.current) placeMarker(next.lat, next.lng, L);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, region, meetPlace, coords, shipping, placeMarker]);

  useEffect(() => {
    if (!mapRef.current || shipping) return;
    const center = getRegionMapCenter(region);
    if (!activeCoords) {
      mapRef.current.setView([center.lat, center.lng], center.zoom, { animate: true });
    }
  }, [region, shipping, activeCoords]);

  async function searchPlace() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setResolveError("");
    try {
      const params = new URLSearchParams({ region, place: q });
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
        setResolveError(body.error ?? "카카오맵에서 장소를 찾지 못했습니다.");
        return;
      }
      const next = { lat: body.lat, lng: body.lng };
      onCoordsChange?.(next);
      onMeetPlaceChange?.(body.label?.trim() || q);
      setDisplayCoords(next);
      const L = leafletRef.current;
      if (L) placeMarker(next.lat, next.lng, L);
    } catch {
      setResolveError("검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setResolveError("이 기기에서는 위치를 사용할 수 없습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onCoordsChange?.(next);
        setDisplayCoords(next);
        const L = leafletRef.current;
        if (L) placeMarker(next.lat, next.lng, L, true);
      },
      () => setResolveError("위치 권한을 허용해 주세요."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  if (shipping) {
    return (
      <p className="text-xs text-muted-foreground rounded-xl border border-dashed p-4 text-center">
        전국 택배 거래는 지도 표시 없이 택배로 진행해 주세요.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {mode === "pick" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="카카오맵 장소 검색 (예: 강남역 2번 출구)"
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
            onClick={useMyLocation}
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
        <div ref={containerRef} className="absolute inset-0 z-0" />
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!activeCoords && mode === "pick" && !loading && (
          <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
            <p className="text-[11px] text-center px-2 py-1 rounded-lg bg-background/90 border shadow-sm">
              지도를 탭하거나 검색해서 거래 장소 핀을 찍어 주세요
            </p>
          </div>
        )}
      </div>

      {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}

      {mode === "pick" && (
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          카카오 로컬 API로 검색·주소 변환됩니다. 핀을 옮기면 장소명이 자동으로 채워져요.
        </p>
      )}
    </div>
  );
}

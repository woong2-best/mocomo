"use client";

import { useEffect, useRef } from "react";
import type { MeetCoords } from "@/lib/maps/types";
import {
  getKakaoMapsNamespace,
  loadKakaoMapsSdk,
  type KakaoMap,
  type KakaoMarker,
} from "@/components/maps/kakao-maps-loader";
import { cn } from "@/lib/utils";

type Props = {
  mode: "view" | "pick";
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  onPick?: (coords: MeetCoords) => void;
  onError?: (message: string) => void;
  className?: string;
};

/** Kakao level: smaller = closer. Map zoom 15 ≈ Kakao level 3. */
function toKakaoLevel(zoom: number) {
  return Math.max(1, Math.min(14, Math.round(18 - zoom)));
}

export function KakaoMeetMapCanvas({
  mode,
  center,
  zoom,
  marker,
  onPick,
  onError,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const onPickRef = useRef(onPick);
  const onErrorRef = useRef(onError);
  onPickRef.current = onPick;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!containerRef.current) return;
      try {
        const kakao = await loadKakaoMapsSdk();
        if (cancelled || !containerRef.current) return;
        const maps = kakao.maps;
        const centerLatLng = new maps.LatLng(center.lat, center.lng);
        const map = new maps.Map(containerRef.current, {
          center: centerLatLng,
          level: toKakaoLevel(zoom),
        });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.TOPRIGHT);
        mapRef.current = map;
        // Container may have been hidden; force layout after mount.
        requestAnimationFrame(() => map.relayout());

        if (mode === "pick") {
          maps.event.addListener(map, "click", (...args: unknown[]) => {
            const mouseEvent = args[0] as { latLng?: { getLat: () => number; getLng: () => number } };
            const latLng = mouseEvent?.latLng;
            if (!latLng) return;
            onPickRef.current?.({ lat: latLng.getLat(), lng: latLng.getLng() });
          });
        }

        if (marker) {
          const m = new maps.Marker({
            position: new maps.LatLng(marker.lat, marker.lng),
            map,
          });
          markerRef.current = m;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "카카오맵을 불러오지 못했습니다.";
        onErrorRef.current?.(message);
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = getKakaoMapsNamespace();
    if (!map || !maps) return;
    map.setCenter(new maps.LatLng(center.lat, center.lng));
    map.setLevel(toKakaoLevel(zoom));
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = getKakaoMapsNamespace();
    if (!map || !maps) return;
    if (!marker) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    const pos = new maps.LatLng(marker.lat, marker.lng);
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
      markerRef.current.setMap(map);
    } else {
      markerRef.current = new maps.Marker({ position: pos, map });
    }
  }, [marker?.lat, marker?.lng]);

  return <div ref={containerRef} className={cn("absolute inset-0", className)} />;
}

"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from "maplibre-gl";
import type { MeetCoords } from "@/lib/maps/types";
import { cn } from "@/lib/utils";

type Props = {
  mode: "view" | "pick";
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  onPick?: (coords: MeetCoords) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
  className?: string;
};

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} satisfies StyleSpecification;

async function loadMapLibre() {
  const mod = await import("maplibre-gl");
  await import("maplibre-gl/dist/maplibre-gl.css");
  const api = (mod as { default?: typeof mod }).default ?? mod;
  if (typeof (api as { Map?: unknown }).Map !== "function") {
    throw new Error("MapLibre Map constructor missing");
  }
  return api as typeof import("maplibre-gl");
}

export function MapLibreMeetMapCanvas({ mode, center, zoom, marker, onPick, onError, onReady, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const onPickRef = useRef(onPick);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  onPickRef.current = onPick;
  onErrorRef.current = onError;
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    void (async () => {
      if (!containerRef.current) return;
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: OSM_STYLE,
          center: [center.lng, center.lat],
          zoom,
          attributionControl: {},
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;

        const resize = () => {
          try {
            map.resize();
          } catch {
            /* ignore */
          }
        };
        map.once("load", () => {
          resize();
          onReadyRef.current?.();
        });
        requestAnimationFrame(resize);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(containerRef.current);

        if (mode === "pick") {
          map.on("click", (e) => {
            onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          });
        }

        if (marker) {
          markerRef.current = new maplibregl.Marker({ color: "#EF4444" })
            .setLngLat([marker.lng, marker.lat])
            .addTo(map);
        }
      } catch (err) {
        onErrorRef.current?.(
          err instanceof Error ? err.message : "MapLibre 지도를 불러오지 못했습니다."
        );
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    mapRef.current?.easeTo({ center: [center.lng, center.lat], zoom });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void loadMapLibre().then((maplibregl) => {
      if (!marker) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }
      if (markerRef.current) {
        markerRef.current.setLngLat([marker.lng, marker.lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#EF4444" })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map);
      }
    });
  }, [marker?.lat, marker?.lng]);

  return <div ref={containerRef} className={cn("absolute inset-0", className)} />;
}

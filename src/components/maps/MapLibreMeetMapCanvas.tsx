"use client";

import { useEffect, useRef } from "react";
import type { MeetCoords } from "@/lib/maps/types";
import { cn } from "@/lib/utils";

type Props = {
  mode: "view" | "pick";
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  onPick?: (coords: MeetCoords) => void;
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
};

export function MapLibreMeetMapCanvas({ mode, center, zoom, marker, onPick, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!containerRef.current) return;
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE as unknown as maplibregl.StyleSpecification,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

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
    })();

    return () => {
      cancelled = true;
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
    void import("maplibre-gl").then((maplibregl) => {
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

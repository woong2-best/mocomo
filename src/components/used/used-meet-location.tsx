"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import { parseMeetCoords, usedMapSearchUrl } from "@/lib/used-market";
import { isShippingOnlyRegion } from "@/lib/used-region-coords";
import { normalizeMeetCountry, selectMapEngine } from "@/lib/maps/select-engine";

const MeetMapView = dynamic(
  () => import("@/components/maps/MeetMapView").then((m) => m.MeetMapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 rounded-xl border bg-muted/30 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
        지도 불러오는 중…
      </div>
    ),
  }
);

export function UsedMeetLocation({
  region,
  meetPlace,
  meetLat,
  meetLng,
  meetCountry,
}: {
  region: string;
  meetPlace?: string | null;
  meetLat?: number | null;
  meetLng?: number | null;
  meetCountry?: string | null;
}) {
  const country = normalizeMeetCountry(meetCountry);
  const engine = selectMapEngine(country);
  const coords = parseMeetCoords(meetLat, meetLng);
  const label = meetPlace?.trim() || region;
  const mapUrl = usedMapSearchUrl(region, meetPlace, coords, country);
  const shipping = isShippingOnlyRegion(region);
  const externalLabel = engine === "kakao" ? "카카오맵" : "OpenStreetMap";

  if (shipping && !meetPlace?.trim()) {
    return (
      <section className="text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0" />
        거래 지역: {region}
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium flex items-center gap-1 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">거래 희망 장소 · {label}</span>
        </h3>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 shrink-0"
        >
          {externalLabel}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <MeetMapView
        mode="view"
        country={country}
        region={region}
        meetPlace={meetPlace ?? undefined}
        coords={coords}
        heightClassName="h-56 sm:h-64"
      />

      <p className="text-xs text-muted-foreground">
        {engine === "kakao"
          ? `${region} 인근 직거래 · 카카오맵으로 표시된 만남 위치입니다`
          : `${region} meetup · MapLibre + OpenStreetMap`}
        {!coords && meetPlace ? " (장소명으로 좌표 검색)" : ""}
      </p>
    </section>
  );
}

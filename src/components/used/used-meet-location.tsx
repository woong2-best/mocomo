"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { parseMeetCoords } from "@/lib/used-market";
import { isShippingOnlyRegion } from "@/lib/used-region-coords";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";

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
  const coords = parseMeetCoords(meetLat, meetLng);
  const placeLabel = meetPlace?.trim();
  const shipping = isShippingOnlyRegion(region);

  if (shipping && !placeLabel) {
    return (
      <section className="text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0" />
        거래 지역: {region}
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-medium flex items-center gap-1 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">거래 지역 · {region}</span>
        </p>
        {placeLabel ? (
          <p className="text-sm text-muted-foreground pl-5 truncate">거래 희망 장소 · {placeLabel}</p>
        ) : null}
      </div>

      <MeetMapView
        mode="view"
        country={country}
        region={region}
        meetPlace={meetPlace ?? undefined}
        coords={coords}
        heightClassName="h-56 sm:h-64"
      />

      <p className="text-[11px] font-semibold leading-4 text-muted-foreground">
        {region} 인근 직거래
      </p>
    </section>
  );
}

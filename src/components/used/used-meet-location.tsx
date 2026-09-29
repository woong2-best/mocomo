"use client";

import { MeetMapView } from "@/components/maps/MeetMapView";
import { parseMeetCoords } from "@/lib/used-market";
import { isShippingOnlyRegion } from "@/lib/used-region-coords";
import { meetMapCaption } from "@/lib/maps/external-url";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";

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
  const shipping = isShippingOnlyRegion(region);

  if (shipping) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        전국 배송 거래는 지도 없이 배송으로 진행해 주세요.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <MeetMapView
        mode="view"
        country={country}
        region={region}
        meetPlace={meetPlace ?? undefined}
        coords={coords}
        heightClassName="h-56 sm:h-64"
      />
      <p className="text-[11px] font-semibold leading-4 text-muted-foreground">
        {meetMapCaption({ region, hasPin: !!coords })}
      </p>
    </section>
  );
}

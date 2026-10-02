"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  googleSearchUrlForMeet,
  marketplaceMeetLocationQuery,
  marketplaceMeetMapUrl,
} from "@/lib/maps/external-url";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import type { MeetMapPayload } from "@/lib/maps/types";
import { MeetMapView } from "@/components/maps/MeetMapView";

type Props = {
  map: MeetMapPayload;
  region?: string | null;
  meetPlace?: string | null;
};

/** Buyer meet-location card — Esri satellite via MapLibre, same as the mobile app. */
export function UsedMeetMapCard({ map, region, meetPlace }: Props) {
  if (!Number.isFinite(map.lat) || !Number.isFinite(map.lng)) {
    return null;
  }

  const country = normalizeMeetCountry(map.country);
  const regionLabel = region?.trim() || "";
  const placeLabel = meetPlace?.trim() || "";
  const locationQuery = marketplaceMeetLocationQuery({ region: regionLabel, place: placeLabel });
  const coords = { lat: map.lat, lng: map.lng };
  const searchUrl = locationQuery
    ? googleSearchUrlForMeet({ place: placeLabel, region: regionLabel })
    : undefined;
  const mapUrl =
    map.externalMapUrl ||
    marketplaceMeetMapUrl({ place: placeLabel, region: regionLabel, coords });

  return (
    <div className="space-y-2">
      <MeetMapView
        mode="view"
        country={country}
        region={regionLabel || map.label}
        meetPlace={placeLabel || undefined}
        coords={coords}
        heightClassName="h-[220px] sm:h-[220px]"
        pinTitle={locationQuery || t("used.s1m4rnnj")}
        pinSearchUrl={searchUrl}
        pinMapUrl={mapUrl}
      />
      <p className="text-[11px] font-semibold leading-4 text-muted-foreground">{map.caption}</p>
    </div>
  );
}

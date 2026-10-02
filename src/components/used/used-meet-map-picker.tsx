"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import dynamic from "next/dynamic";
import type { MeetCoords } from "@/lib/used-market";
import { Input } from "@/components/ui/input";

const MeetMapView = dynamic(
  () => import("@/components/maps/MeetMapView").then((m) => m.MeetMapView),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full rounded-xl bg-muted animate-pulse" />,
  }
);

type UsedMeetMapPickerProps = {
  region: string;
  country: string;
  meetPlace: string;
  onMeetPlaceChange: (value: string) => void;
  coords: MeetCoords | null;
  onCoordsChange: (coords: MeetCoords | null) => void;
  onGeocodeLabel?: (label: string) => void;
};

export function UsedMeetMapPicker({
  region,
  country,
  meetPlace,
  onMeetPlaceChange,
  coords,
  onCoordsChange,
  onGeocodeLabel,
}: UsedMeetMapPickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {t("used.sl3oqy5")}
      </p>
      <MeetMapView
        mode="pick"
        country={country}
        region={region}
        coords={coords}
        onCoordsChange={onCoordsChange}
        onGeocodeLabel={onGeocodeLabel}
        heightClassName="h-56"
      />
      <Input
        placeholder={t("used.sn2yei3")}
        value={meetPlace}
        onChange={(e) => onMeetPlaceChange(e.target.value)}
        className="rounded-xl h-11"
      />
    </div>
  );
}

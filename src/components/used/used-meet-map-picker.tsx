"use client";

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
};

export function UsedMeetMapPicker({
  region,
  country,
  meetPlace,
  onMeetPlaceChange,
  coords,
  onCoordsChange,
}: UsedMeetMapPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">거래 희망 장소</label>
      <MeetMapView
        mode="pick"
        country={country}
        region={region}
        meetPlace={meetPlace}
        coords={coords}
        onCoordsChange={onCoordsChange}
        onMeetPlaceChange={onMeetPlaceChange}
        heightClassName="h-56"
      />
      <Input
        placeholder="동·거리 등 상세 위치 (예: 역삼동 스타벅스 앞)"
        value={meetPlace}
        onChange={(e) => onMeetPlaceChange(e.target.value)}
        className="rounded-xl h-11"
      />
    </div>
  );
}

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
        위 칸은 지도 검색용입니다. 건물·출입구 등 상세는 아래 주소 상세에 적어 주세요.
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
        placeholder="주소 상세 (예: 2번 출구 스타벅스 앞)"
        value={meetPlace}
        onChange={(e) => onMeetPlaceChange(e.target.value)}
        className="rounded-xl h-11"
      />
    </div>
  );
}

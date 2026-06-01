"use client";

import { UsedMeetMap } from "@/components/used/used-meet-map";
import type { MeetCoords } from "@/lib/used-market";
import { Input } from "@/components/ui/input";

type UsedMeetMapPickerProps = {
  region: string;
  meetPlace: string;
  onMeetPlaceChange: (value: string) => void;
  coords: MeetCoords | null;
  onCoordsChange: (coords: MeetCoords | null) => void;
};

export function UsedMeetMapPicker({
  region,
  meetPlace,
  onMeetPlaceChange,
  coords,
  onCoordsChange,
}: UsedMeetMapPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">거래 희망 장소</label>
      <UsedMeetMap
        mode="pick"
        region={region}
        meetPlace={meetPlace}
        coords={coords}
        onCoordsChange={onCoordsChange}
        onMeetPlaceChange={onMeetPlaceChange}
        heightClassName="h-56"
      />
      <Input
        placeholder="상세 설명 (예: 신호등 앞, 편의점 옆)"
        value={meetPlace}
        onChange={(e) => onMeetPlaceChange(e.target.value)}
        className="rounded-xl h-11"
      />
    </div>
  );
}

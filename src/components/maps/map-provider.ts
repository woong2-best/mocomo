import type { MapEngineId, MeetCoords, MeetMapMode } from "@/lib/maps/types";
import { selectMapEngine } from "@/lib/maps/select-engine";

export type MeetMapProviderProps = {
  mode: MeetMapMode;
  country: string;
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  onPick?: (coords: MeetCoords) => void;
  className?: string;
};

/** Factory — callers never choose an engine directly. */
export function resolveMeetMapEngine(country?: string | null): MapEngineId {
  return selectMapEngine(country);
}

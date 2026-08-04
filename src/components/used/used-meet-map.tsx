"use client";

/**
 * Backward-compatible wrapper — engine selection lives in MeetMapView (MapProvider).
 * KR → Kakao Maps JS SDK · else → MapLibre GL + OSM.
 */
export { MeetMapView as UsedMeetMap } from "@/components/maps/MeetMapView";
export type { MeetMapViewProps as UsedMeetMapProps } from "@/components/maps/MeetMapView";

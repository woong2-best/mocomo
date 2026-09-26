"use client";

/**
 * Backward-compatible wrapper — engine selection lives in MeetMapView (MapProvider).
 * MapLibre GL + OSM tiles; external links open Google Maps.
 */
export { MeetMapView as UsedMeetMap } from "@/components/maps/MeetMapView";
export type { MeetMapViewProps as UsedMeetMapProps } from "@/components/maps/MeetMapView";

/** Shared meet-map types — web & mobile keep the same shape. */

export type MapEngineId = "kakao" | "maplibre" | "google" | "apple";

export type MeetCoords = {
  lat: number;
  lng: number;
};

export type MeetLocation = {
  latitude: number;
  longitude: number;
  country: string;
  place?: string | null;
};

export type MeetMapMode = "view" | "pick";

export type MeetMapCamera = {
  lat: number;
  lng: number;
  zoom: number;
};

/**
 * Engine-agnostic map surface contract.
 * Implementations: Kakao (KR), MapLibre+OSM (else). Google/Apple can plug in later.
 */
export type MapProviderCapabilities = {
  engine: MapEngineId;
  supportsPick: boolean;
  supportsCurrentLocation: boolean;
  supportsMarker: boolean;
  supportsZoom: boolean;
};

export type MeetMapPayload = {
  label: string;
  lat: number;
  lng: number;
  hasPin: boolean;
  country: string;
  /** Country-selected deep link (Kakao for KR, OSM for others). */
  externalMapUrl: string;
  caption: string;
};

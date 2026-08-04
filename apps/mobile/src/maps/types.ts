export type MapEngineId = "kakao" | "maplibre" | "google" | "apple";

export type MeetCoords = {
  lat: number;
  lng: number;
};

export type MeetMapMode = "view" | "pick";

export type MeetMapPayload = {
  label: string;
  lat: number;
  lng: number;
  hasPin: boolean;
  country: string;
  engine?: string;
  externalMapUrl: string;
  /** @deprecated use externalMapUrl */
  kakaoMapUrl?: string;
  caption: string;
};

/**
 * MapProvider contract — engines plug in behind this.
 * Callers never choose Kakao/MapLibre directly; use selectMapEngine(country).
 */
export type MapProviderProps = {
  mode: MeetMapMode;
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  onPick?: (coords: MeetCoords) => void;
  style?: object;
};

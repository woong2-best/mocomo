import { normalizeMeetCountry, selectMapEngine } from "@/lib/maps/select-engine";
import type { MeetCoords } from "@/lib/maps/types";

/** Country-aware external map deep link (same for web + mobile clients). */
export function meetExternalMapUrl(opts: {
  country?: string | null;
  region?: string | null;
  place?: string | null;
  coords?: MeetCoords | null;
}): string {
  const country = normalizeMeetCountry(opts.country);
  const engine = selectMapEngine(country);
  const coords = opts.coords;
  const q = [opts.place?.trim(), opts.region?.trim()].filter(Boolean).join(" ");

  if (engine === "kakao") {
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      return `https://map.kakao.com/link/map/${coords.lat},${coords.lng}`;
    }
    return `https://map.kakao.com/?q=${encodeURIComponent(q || opts.region || "한국")}`;
  }

  // MapLibre / OSM — openstreetmap.org
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    const z = 16;
    return `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=${z}/${coords.lat}/${coords.lng}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q || "world")}`;
}

export function meetMapCaption(opts: {
  country?: string | null;
  region?: string | null;
  hasPin: boolean;
}): string {
  const engine = selectMapEngine(opts.country);
  const region = opts.region?.trim() || "";
  if (engine === "kakao") {
    return opts.hasPin
      ? `${region} 인근 직거래 · 카카오맵으로 표시된 만남 위치입니다`
      : `${region} 인근 · 정확한 만남 핀이 없어 지역 중심으로 표시합니다`;
  }
  return opts.hasPin
    ? `${region} meetup · shown on OpenStreetMap (MapLibre)`
    : `${region} · approximate area (no exact pin)`;
}

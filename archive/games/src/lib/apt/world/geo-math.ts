import { GLOBE_RADIUS_UNITS } from "@/lib/apt/housing-types";

const DEG = Math.PI / 180;

export function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS_UNITS) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function vector3ToLatLng(x: number, y: number, z: number) {
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, y / r))) / DEG);
  const lng = Math.atan2(z, -x) / DEG - 180;
  return { lat, lng };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a =
    Math.sin(((lat2 - lat1) * DEG) / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(((lng2 - lng1) * DEG) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatCoords(lat: number, lng: number) {
  const latH = lat >= 0 ? "N" : "S";
  const lngH = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latH}, ${Math.abs(lng).toFixed(4)}°${lngH}`;
}

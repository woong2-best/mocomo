export type ScreenPt = { x: number; y: number };

export const CLUMP_RADIUS_PX = 28;
/** Zoom that splits a stacked pile into separate pins at their real spots. */
export const CLUMP_SEPARATE_MAX_ZOOM = 16;
/** Isolated pin tap — building / rooftop. */
export const PIN_FOCUS_ZOOM = 18;

export function geoCentroid(points: { lng: number; lat: number }[]): {
  lng: number;
  lat: number;
} {
  if (points.length === 0) return { lng: 0, lat: 0 };
  let lng = 0;
  let lat = 0;
  for (const point of points) {
    lng += point.lng;
    lat += point.lat;
  }
  return { lng: lng / points.length, lat: lat / points.length };
}

export function clumpLngLatBounds(points: { lng: number; lat: number }[]): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} | null {
  const usable = points.filter(
    (point) => Number.isFinite(point.lng) && Number.isFinite(point.lat)
  );
  if (usable.length === 0) return null;
  let minLng = usable[0]!.lng;
  let maxLng = usable[0]!.lng;
  let minLat = usable[0]!.lat;
  let maxLat = usable[0]!.lat;
  for (const point of usable) {
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function clumpIsSameSpot(points: { lng: number; lat: number }[]): boolean {
  const bounds = clumpLngLatBounds(points);
  if (!bounds) return true;
  return bounds.maxLng - bounds.minLng < 1e-4 && bounds.maxLat - bounds.minLat < 1e-4;
}

function degPerPixel(zoom: number): number {
  return 360 / (256 * 2 ** Math.max(zoom, 1));
}

/** The visual blob around the nearest pin to a tap, using current zoom. */
export function pileAroundTap<T extends { lat: number; lng: number }>(
  items: T[],
  tap: { lat: number; lng: number },
  zoom: number,
  radiusPx = CLUMP_RADIUS_PX
): T[] {
  const maxDeg = degPerPixel(zoom) * radiusPx;
  const cos = Math.max(0.15, Math.cos((tap.lat * Math.PI) / 180));
  const dist = (item: T, point: { lat: number; lng: number }) =>
    Math.hypot(item.lat - point.lat, (item.lng - point.lng) * cos);
  let nearest: T | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const d = dist(item, tap);
    if (d < best) {
      best = d;
      nearest = item;
    }
  }
  if (!nearest || best > maxDeg) return [];
  return items.filter((item) => dist(item, nearest) <= maxDeg);
}

export function viewForPile(group: { lat: number; lng: number }[]): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const center = geoCentroid(group);
  if (clumpIsSameSpot(group)) {
    return { lat: center.lat, lng: center.lng, zoom: CLUMP_SEPARATE_MAX_ZOOM };
  }
  const bounds = clumpLngLatBounds(group);
  if (!bounds) {
    return { lat: center.lat, lng: center.lng, zoom: CLUMP_SEPARATE_MAX_ZOOM };
  }
  const span = Math.max(bounds.maxLng - bounds.minLng, bounds.maxLat - bounds.minLat);
  const padded = Math.max(span * 1.8, 1e-5);
  const zoom = Math.min(CLUMP_SEPARATE_MAX_ZOOM, Math.max(4, Math.log2(360 / padded)));
  return { lat: center.lat, lng: center.lng, zoom };
}

export type ScreenPt = { x: number; y: number };

/** Zoom that splits a stacked pile into separate pins at their real spots. */
export const CLUMP_SEPARATE_MAX_ZOOM = 16;
/** Isolated pin click — building / rooftop. */
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

export function itemsNearScreenPoint<T>(
  items: T[],
  project: (item: T) => ScreenPt,
  point: ScreenPt,
  radiusPx: number
): T[] {
  const radius2 = radiusPx * radiusPx;
  const hits: { item: T; d2: number }[] = [];
  for (const item of items) {
    const projected = project(item);
    const dx = projected.x - point.x;
    const dy = projected.y - point.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= radius2) hits.push({ item, d2 });
  }
  hits.sort((left, right) => left.d2 - right.d2);
  return hits.map((hit) => hit.item);
}

/** The visual blob: pins overlapping the nearest pin, not every pin near the click. */
export function pileAroundNearest<T>(
  items: T[],
  project: (item: T) => ScreenPt,
  point: ScreenPt,
  radiusPx: number
): T[] {
  const nearClick = itemsNearScreenPoint(items, project, point, radiusPx);
  const nearest = nearClick[0];
  if (!nearest) return [];
  return itemsNearScreenPoint(items, project, project(nearest), radiusPx);
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

/** True when the pile is basically one building — zoom cannot split it. */
export function clumpIsSameSpot(points: { lng: number; lat: number }[]): boolean {
  const bounds = clumpLngLatBounds(points);
  if (!bounds) return true;
  return bounds.maxLng - bounds.minLng < 1e-4 && bounds.maxLat - bounds.minLat < 1e-4;
}

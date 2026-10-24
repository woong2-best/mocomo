export type ScreenPt = { x: number; y: number };

/** One click on a pile should feel like 10 → 5, not a jump to street level. */
export const CLUMP_ZOOM_STEP = 1.8;

export function nextClumpZoom(currentZoom: number, maxZoom: number): number {
  if (!Number.isFinite(currentZoom)) return Math.min(maxZoom, CLUMP_ZOOM_STEP);
  return Math.min(maxZoom, currentZoom + CLUMP_ZOOM_STEP);
}

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

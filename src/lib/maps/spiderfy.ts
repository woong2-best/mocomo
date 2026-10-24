export type ScreenPt = { x: number; y: number };

const CIRCLE_LIMIT = 9;
const BASE_RADIUS = 36;
const RADIUS_STEP = 4;
const SPIRAL_START = 40;
const SPIRAL_GROWTH = 6;

/** Pixel offsets from a clump center. Circle for small groups, spiral after that. */
export function spiderfyOffsets(count: number): ScreenPt[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0 }];
  if (count <= CIRCLE_LIMIT) {
    const radius = BASE_RADIUS + (count - 2) * RADIUS_STEP;
    return Array.from({ length: count }, (_, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }
  const offsets: ScreenPt[] = [];
  let angle = -Math.PI / 2;
  let radius = SPIRAL_START;
  for (let index = 0; index < count; index += 1) {
    offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    radius += SPIRAL_GROWTH;
    angle += Math.min(Math.PI / 3, (Math.PI * 2 * 11) / Math.max(radius, 28));
  }
  return offsets;
}

export function screenCentroid(points: ScreenPt[]): ScreenPt {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
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

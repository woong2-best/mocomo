/** Nominatim (OSM) geocoding for non-KR meet locations. */

export type NominatimCoord = { lat: number; lng: number; label: string };

const USER_AGENT = "MoCoMo/1.0 (used-marketplace; https://mocomo.net)";

function parseCoord(lat: unknown, lon: unknown, label: string): NominatimCoord | null {
  const la = typeof lat === "string" ? parseFloat(lat) : Number(lat);
  const ln = typeof lon === "string" ? parseFloat(lon) : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return { lat: la, lng: ln, label: label.trim() || `${la.toFixed(5)}, ${ln.toFixed(5)}` };
}

export async function nominatimSearchPlace(query: string): Promise<NominatimCoord | null> {
  const q = query.trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  const first = rows[0];
  if (!first) return null;
  return parseCoord(first.lat, first.lon, first.display_name ?? q);
}

export async function nominatimReverse(lat: number, lng: number): Promise<NominatimCoord | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { lat?: string; lon?: string; display_name?: string };
  return parseCoord(body.lat ?? lat, body.lon ?? lng, body.display_name ?? "");
}

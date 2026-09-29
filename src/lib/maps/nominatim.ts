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

type NominatimSearchOpts = {
  limit?: number;
  /** ISO 3166-1 alpha-2, e.g. kr */
  countryCodes?: string;
};

async function nominatimSearchRaw(
  query: string,
  opts?: NominatimSearchOpts
): Promise<NominatimCoord[]> {
  const q = query.trim();
  if (!q) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 1, 1), 10);
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: String(limit),
    q,
  });
  const cc = opts?.countryCodes?.trim().toLowerCase();
  if (cc) params.set("countrycodes", cc);
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  const out: NominatimCoord[] = [];
  for (const row of rows) {
    const parsed = parseCoord(row.lat, row.lon, row.display_name ?? q);
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function nominatimSearchPlaces(
  query: string,
  limit = 5,
  opts?: Omit<NominatimSearchOpts, "limit">
): Promise<NominatimCoord[]> {
  return nominatimSearchRaw(query, { ...opts, limit });
}

export async function nominatimSearchPlace(query: string): Promise<NominatimCoord | null> {
  const rows = await nominatimSearchRaw(query, { limit: 1 });
  return rows[0] ?? null;
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

/** Nominatim geocoding with country bias + Accept-Language for global events. */

export type CountryCoord = { lat: number; lng: number; label: string };

const USER_AGENT = "MoCoMo-SubcultureEvents/1.0 (+https://mocomo.net/events/map)";

export async function nominatimSearchPlaceInCountry(
  query: string,
  countryIso: string,
  acceptLanguage: string
): Promise<CountryCoord | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    q,
    countrycodes: countryIso.toLowerCase(),
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": acceptLanguage,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const rows = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  const hit = rows[0];
  if (!hit?.lat || !hit?.lon) return null;

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: hit.display_name?.trim() || q,
  };
}

/**
 * 17TRACK numeric carrier codes for common marketplace carriers.
 * Unknown slugs → auto-detection at register time (no carrier param).
 * @see https://res.17track.net/asset/carrier/info/apicarrier.all.json
 */
export const SEVENTEEN_TRACK_CARRIER_BY_SLUG: Record<string, number> = {
  "usps": 21051,
  "ups": 100002,
  "fedex": 100003,
  "dhl": 100001,
  "korea-post": 11031,
  "cj-korea-thai": 11027,
  "hanjin": 11033,
  "lotte": 11035,
  "japan-post": 11061,
  "yamato": 11062,
  "sagawa": 11063,
  "china-post": 11081,
  "sf-express": 11072,
  "jd": 11074,
  "ems": 11031,
};

export function resolve17TrackCarrierCode(trackingSlug?: string | null): number | undefined {
  if (!trackingSlug?.trim()) return undefined;
  const key = trackingSlug.trim().toLowerCase();
  return SEVENTEEN_TRACK_CARRIER_BY_SLUG[key];
}

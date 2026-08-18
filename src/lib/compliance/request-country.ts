/** Geo country from Vercel / Cloudflare edge headers (Edge + Node safe). */
export function getRequestCountryFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country")?.trim() ||
    headers.get("cf-ipcountry")?.trim() ||
    null;
  if (!raw || raw === "XX" || raw === "T1") return null;
  return raw.toUpperCase();
}

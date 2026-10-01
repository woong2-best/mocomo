type HeaderLike = { get(name: string): string | null | undefined };

/** Real client IP behind Cloudflare / AWS ALB / reverse proxies. */
export function extractClientIp(headers: HeaderLike): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const trueClient = headers.get("true-client-ip")?.trim();
  if (trueClient) return trueClient;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

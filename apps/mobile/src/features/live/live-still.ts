/** Frozen live still — never a playing video, never a profile photo. */
export function freshLiveStill(url: string | null | undefined): string | null {
  const raw = url?.trim() || null;
  if (!raw) return null;
  if (!raw.includes("previews-ttv")) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set("t", String(Math.floor(Date.now() / 300_000)));
    return u.toString();
  } catch {
    return raw;
  }
}

export function youtubeStillFromEmbed(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  try {
    const parts = new URL(embedUrl).pathname.split("/").filter(Boolean);
    const i = parts.indexOf("embed");
    const id = i >= 0 ? parts[i + 1] : null;
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
  } catch {
    const m = /\/embed\/([a-zA-Z0-9_-]{11})/.exec(embedUrl);
    if (m?.[1]) return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`;
  }
  return null;
}

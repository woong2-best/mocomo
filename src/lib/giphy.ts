import { isGiphyMediaUrl } from "@/lib/comment-media";

export type GiphyPlatform = "web" | "android" | "ios";

export type GiphyGifItem = {
  id: string;
  previewUrl: string;
  playUrl: string;
};

type GiphyImage = {
  url?: string;
  webp?: string;
  mp4?: string;
};

type GiphyRow = {
  id?: string;
  images?: {
    original?: GiphyImage;
    fixed_height?: GiphyImage;
    fixed_height_small?: GiphyImage;
    preview_webp?: GiphyImage;
  };
};

/** Server-only. Never import this into a client bundle. */
export function getGiphyApiKey(platform: GiphyPlatform = "web"): string {
  if (platform === "android") {
    return process.env.GIPHY_API_KEY_ANDROID?.trim() || process.env.GIPHY_API_KEY_WEB?.trim() || "";
  }
  if (platform === "ios") {
    return process.env.GIPHY_API_KEY_IOS?.trim() || process.env.GIPHY_API_KEY_WEB?.trim() || "";
  }
  return process.env.GIPHY_API_KEY_WEB?.trim() || "";
}

export function resolveGiphyPlatform(input: { header?: string | null; userAgent?: string | null }): GiphyPlatform {
  const header = input.header?.trim().toLowerCase();
  if (header === "ios" || header === "android" || header === "web") return header;
  const ua = input.userAgent?.toLowerCase() ?? "";
  if (/\b(iphone|ipad|ipod|ios)\b/.test(ua)) return "ios";
  if (/\bandroid\b/.test(ua)) return "android";
  return "web";
}

export function isGiphyConfigured(platform: GiphyPlatform = "web") {
  return Boolean(getGiphyApiKey(platform));
}

function firstAllowed(...urls: Array<string | undefined>) {
  for (const raw of urls) {
    const url = raw?.trim() ?? "";
    if (url && isGiphyMediaUrl(url)) return url;
  }
  return "";
}

function mapRow(row: GiphyRow): GiphyGifItem | null {
  const id = row.id?.trim();
  const images = row.images;
  const previewUrl = firstAllowed(
    images?.fixed_height_small?.webp,
    images?.preview_webp?.url,
    images?.fixed_height?.webp,
    images?.fixed_height?.url,
    images?.original?.webp,
  );
  const playUrl = firstAllowed(
    images?.fixed_height?.mp4,
    images?.original?.mp4,
    images?.fixed_height?.webp,
    images?.original?.webp,
    images?.original?.url,
    previewUrl,
  );
  if (!id || !previewUrl || !playUrl) return null;
  return { id, previewUrl, playUrl };
}

export async function searchGiphyGifs(q: string, platform: GiphyPlatform = "web"): Promise<GiphyGifItem[]> {
  const key = getGiphyApiKey(platform);
  if (!key) return [];
  const query = q.trim();
  const path = query ? "gifs/search" : "gifs/trending";
  const params = new URLSearchParams({
    api_key: key,
    limit: "24",
    rating: "g",
    bundle: "messaging_non_clips",
  });
  if (query) params.set("q", query.slice(0, 80));
  const res = await fetch(`https://api.giphy.com/v1/${path}?${params}`, {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: GiphyRow[] };
  return (json.data ?? []).map(mapRow).filter((row): row is GiphyGifItem => row != null);
}

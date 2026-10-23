import { isTenorMediaUrl } from "@/lib/comment-media";

export type TenorGifItem = {
  id: string;
  previewUrl: string;
  playUrl: string;
};

type TenorFormat = { url?: string };
type TenorResult = {
  id?: string;
  media_formats?: Record<string, TenorFormat>;
};

function tenorKey() {
  return process.env.TENOR_API_KEY?.trim() || "";
}

function pickUrl(formats: Record<string, TenorFormat> | undefined, names: string[]) {
  if (!formats) return "";
  for (const name of names) {
    const url = formats[name]?.url?.trim() ?? "";
    if (url && isTenorMediaUrl(url)) return url;
  }
  return "";
}

function mapResult(row: TenorResult): TenorGifItem | null {
  const id = row.id?.trim();
  const formats = row.media_formats;
  const previewUrl = pickUrl(formats, ["tinygif", "nanogif", "tinywebp", "webp", "gif"]);
  const playUrl = pickUrl(formats, ["tinygif", "webp", "mp4", "tinywebm", "gif"]) || previewUrl;
  if (!id || !previewUrl || !playUrl) return null;
  return { id, previewUrl, playUrl };
}

async function tenorGet(path: string, query: Record<string, string>): Promise<TenorGifItem[]> {
  const key = tenorKey();
  if (!key) return [];
  const params = new URLSearchParams({
    key,
    client_key: "mocomo",
    media_filter: "tinygif,nanogif,gif,webp,tinywebp,mp4,tinywebm",
    limit: "24",
    ...query,
  });
  const res = await fetch(`https://tenor.googleapis.com/v2/${path}?${params}`, {
    signal: AbortSignal.timeout(8_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: TenorResult[] };
  return (json.results ?? []).map(mapResult).filter((row): row is TenorGifItem => row != null);
}

export function isTenorConfigured() {
  return Boolean(tenorKey());
}

export async function searchTenorGifs(q: string): Promise<TenorGifItem[]> {
  const query = q.trim();
  if (!query) return tenorGet("featured", {});
  return tenorGet("search", { q: query.slice(0, 80) });
}

/**
 * YouTube Data API — Made for Kids check before embedding.
 * Never use view/subscriber counts for ranking (policy).
 */

export type YoutubeKidsCheckResult =
  | { ok: true; videoId: string; madeForKids: boolean; title?: string }
  | { ok: false; error: string; videoId?: string };

function apiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

export function isYoutubeDataApiConfigured(): boolean {
  return !!apiKey();
}

export async function checkYoutubeMadeForKids(
  videoId: string
): Promise<YoutubeKidsCheckResult> {
  const key = apiKey();
  if (!key) {
    // Fail open in dev without key — production should set the key.
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "YouTube Data API 키가 설정되지 않아 임베드를 확인할 수 없습니다.",
        videoId,
      };
    }
    return { ok: true, videoId, madeForKids: false, title: undefined };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "status,snippet");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) {
      return {
        ok: false,
        error: `YouTube API 오류 (${res.status})`,
        videoId,
      };
    }
    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        status?: { madeForKids?: boolean; selfDeclaredMadeForKids?: boolean };
        snippet?: { title?: string };
      }>;
    };
    const item = data.items?.[0];
    if (!item) {
      return { ok: false, error: "영상을 찾을 수 없습니다.", videoId };
    }
    const madeForKids = !!(
      item.status?.madeForKids || item.status?.selfDeclaredMadeForKids
    );
    return {
      ok: true,
      videoId,
      madeForKids,
      title: item.snippet?.title?.trim(),
    };
  } catch {
    return { ok: false, error: "YouTube API 요청에 실패했습니다.", videoId };
  }
}

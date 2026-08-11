/**
 * YouTube Data API — Made for Kids check before embedding.
 * Never use view/subscriber counts for ranking (policy).
 *
 * Prefer OAuth bearer token (connected streaming account) so production
 * does not hard-require YOUTUBE_DATA_API_KEY for go-live.
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
  videoId: string,
  opts?: { accessToken?: string | null }
): Promise<YoutubeKidsCheckResult> {
  const key = apiKey();
  const accessToken = opts?.accessToken?.trim() || null;

  if (!key && !accessToken) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error:
          "YouTube 확인용 API 키 또는 OAuth 토큰이 없습니다. 스트리밍 계정에서 YouTube를 다시 연결하거나, 서버에 YOUTUBE_DATA_API_KEY를 설정해 주세요.",
        videoId,
      };
    }
    return { ok: true, videoId, madeForKids: false, title: undefined };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "status,snippet");
  url.searchParams.set("id", videoId);

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (key) {
    url.searchParams.set("key", key);
  }

  try {
    const res = await fetch(url.toString(), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (/accessNotConfigured|has not been used|disabled/i.test(body)) {
        return {
          ok: false,
          error:
            "GCP에서 YouTube Data API v3를 사용 설정한 뒤 다시 시도해 주세요.",
          videoId,
        };
      }
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

import { safeLogWarn } from "@/lib/safe-log";

export type YoutubeVideoMeta = {
  videoId: string;
  title: string;
  channelId: string;
  durationSec: number;
  embeddable: boolean;
  privacyStatus: string;
  ageRestricted: boolean;
};

export type YoutubeValidationResult =
  | { ok: true; meta: YoutubeVideoMeta }
  | { ok: false; error: string; code: string };

function parseIso8601Duration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso.trim());
  if (!m) return 0;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return h * 3600 + min * 60 + s;
}

export function isYoutubeDataApiConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_DATA_API_KEY?.trim());
}

/** YouTube Data API v3 — videos.list (contentDetails, status, snippet) */
export async function fetchYoutubeVideoMeta(videoId: string): Promise<YoutubeVideoMeta | null> {
  const key = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails,status,snippet");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    safeLogWarn("youtube-data-api", { event: "videos.list_failed", status: res.status });
    return null;
  }

  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; channelId?: string };
      contentDetails?: { duration?: string };
      status?: {
        embeddable?: boolean;
        privacyStatus?: string;
        contentRating?: { ytRating?: string };
      };
    }>;
  };

  const item = json.items?.[0];
  if (!item?.id) return null;

  const durationSec = parseIso8601Duration(item.contentDetails?.duration ?? "PT0S");
  const ytRating = item.status?.contentRating?.ytRating;
  const ageRestricted = ytRating === "ytAgeRestricted";

  return {
    videoId: item.id,
    title: item.snippet?.title?.slice(0, 200) ?? "",
    channelId: item.snippet?.channelId ?? "",
    durationSec,
    embeddable: item.status?.embeddable !== false,
    privacyStatus: item.status?.privacyStatus ?? "unknown",
    ageRestricted,
  };
}

export async function validateYoutubeForDonation(input: {
  videoId: string;
  segmentSec: number;
  videoDurationSec?: number;
}): Promise<YoutubeValidationResult> {
  if (!isYoutubeDataApiConfigured()) {
    return {
      ok: false,
      error: "영상 검증 서비스가 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.",
      code: "YOUTUBE_API_NOT_CONFIGURED",
    };
  }

  const meta = await fetchYoutubeVideoMeta(input.videoId);
  if (!meta) {
    return {
      ok: false,
      error: "영상을 찾을 수 없거나 삭제·비공개 상태입니다.",
      code: "YOUTUBE_NOT_FOUND",
    };
  }

  if (meta.privacyStatus !== "public") {
    return {
      ok: false,
      error: "공개(Public) 영상만 후원할 수 있습니다.",
      code: "YOUTUBE_NOT_PUBLIC",
    };
  }

  if (!meta.embeddable) {
    return {
      ok: false,
      error: "외부 재생(퍼가기)이 허용되지 않은 영상입니다.",
      code: "YOUTUBE_NOT_EMBEDDABLE",
    };
  }

  if (meta.ageRestricted) {
    return {
      ok: false,
      error: "연령 제한 영상은 후원할 수 없습니다.",
      code: "YOUTUBE_AGE_RESTRICTED",
    };
  }

  const totalDur = input.videoDurationSec ?? meta.durationSec;
  if (totalDur > 0 && input.segmentSec > totalDur) {
    return {
      ok: false,
      error: "선택한 구간이 영상 길이보다 깁니다.",
      code: "YOUTUBE_SEGMENT_TOO_LONG",
    };
  }

  return { ok: true, meta };
}

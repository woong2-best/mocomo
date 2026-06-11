/** YouTube 영상 URL 검증 (영상 후원용) */

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeVideoId(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;

  if (YOUTUBE_ID.test(url)) return url;

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return YOUTUBE_ID.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = parsed.searchParams.get("v");
      if (v && YOUTUBE_ID.test(v)) return v;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && YOUTUBE_ID.test(parts[embedIdx + 1]!)) {
        return parts[embedIdx + 1]!;
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1] && YOUTUBE_ID.test(parts[shortsIdx + 1]!)) {
        return parts[shortsIdx + 1]!;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeYoutubeUrl(raw: string): string | null {
  const id = extractYoutubeVideoId(raw);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(videoId: string, autoplay = false): string {
  const params = autoplay ? "?autoplay=1&rel=0" : "?rel=0";
  return `https://www.youtube-nocookie.com/embed/${videoId}${params}`;
}

export const VIDEO_TIP_MIN_KRW = 5_000;

export type LiveVideoDonationPayload = {
  id: string;
  channelId: string;
  tipId: string;
  amount: number;
  videoUrl: string | null;
  videoId: string | null;
  videoTitle: string | null;
  status: string;
  rejectReason: string | null;
  username: string;
  senderId: string;
  message: string | null;
  at: number;
};

export function toVideoDonationPayload(row: {
  id: string;
  channelId: string;
  tipId: string;
  amount: number;
  videoUrl: string | null;
  videoTitle: string | null;
  status: string;
  rejectReason: string | null;
  senderId: string;
  createdAt: Date;
  sender: { username: string };
  tip: { message: string | null };
}): LiveVideoDonationPayload {
  const videoId = row.videoUrl ? extractYoutubeVideoId(row.videoUrl) : null;
  return {
    id: row.id,
    channelId: row.channelId,
    tipId: row.tipId,
    amount: row.amount,
    videoUrl: row.videoUrl,
    videoId,
    videoTitle: row.videoTitle,
    status: row.status,
    rejectReason: row.rejectReason,
    username: row.sender.username,
    senderId: row.senderId,
    message: row.tip.message,
    at: row.createdAt.getTime(),
  };
}

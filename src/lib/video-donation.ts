/** YouTube 영상 후원 — 치지직 스타일 설정·계산 */

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

export function youtubeEmbedUrl(
  videoId: string,
  opts?: { autoplay?: boolean; startSec?: number; endSec?: number }
): string {
  const params = new URLSearchParams();
  if (opts?.autoplay) params.set("autoplay", "1");
  params.set("rel", "0");
  if (opts?.startSec && opts.startSec > 0) params.set("start", String(Math.floor(opts.startSec)));
  if (opts?.endSec && opts.endSec > 0) params.set("end", String(Math.floor(opts.endSec)));
  const q = params.toString();
  return `https://www.youtube-nocookie.com/embed/${videoId}${q ? `?${q}` : ""}`;
}

export type VideoDonationSettings = {
  rateKrwPerSec: number;
  minKrw: number;
  maxSec: number;
};

export const DEFAULT_VIDEO_DONATION_SETTINGS: VideoDonationSettings = {
  rateKrwPerSec: 100,
  minKrw: 5_000,
  maxSec: 120,
};

/** @deprecated DEFAULT_VIDEO_DONATION_SETTINGS.minKrw 사용 */
export const VIDEO_TIP_MIN_KRW = DEFAULT_VIDEO_DONATION_SETTINGS.minKrw;

export function calcVideoDonationAmount(
  durationSec: number,
  settings: VideoDonationSettings
): number {
  const sec = Math.max(1, Math.min(durationSec, settings.maxSec));
  const raw = sec * settings.rateKrwPerSec;
  return Math.max(settings.minKrw, Math.round(raw));
}

export function calcSegmentDurationSec(input: {
  startSec: number;
  endSec: number | null;
  playToEnd: boolean;
  maxSec: number;
}): number {
  if (input.playToEnd) return input.maxSec;
  const start = Math.max(0, Math.floor(input.startSec));
  const end = Math.max(start + 1, Math.floor(input.endSec ?? start + 1));
  return Math.min(end - start, input.maxSec);
}

export function formatSecLabel(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type VideoDonationCheckoutMeta = {
  videoUrl: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  description?: string;
  startSec: number;
  endSec?: number;
  playToEnd: boolean;
  durationSec: number;
  anonymous: boolean;
};

export type LiveVideoDonationPayload = {
  id: string;
  channelId: string;
  tipId: string;
  amount: number;
  videoUrl: string | null;
  videoId: string | null;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  startSec: number;
  endSec: number | null;
  playToEnd: boolean;
  durationSec: number | null;
  anonymous: boolean;
  status: string;
  rejectReason: string | null;
  username: string;
  senderId: string;
  message: string | null;
  at: number;
};

export type VideoDonationHistoryItem = {
  id: string;
  videoUrl: string;
  videoId: string;
  videoTitle: string | null;
  thumbnailUrl: string | null;
  amount: number;
  at: number;
};

export function toVideoDonationPayload(row: {
  id: string;
  channelId: string;
  tipId: string;
  amount: number;
  videoUrl: string | null;
  videoTitle: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  startSec?: number;
  endSec?: number | null;
  playToEnd?: boolean;
  durationSec?: number | null;
  anonymous?: boolean;
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
    thumbnailUrl: row.thumbnailUrl ?? null,
    description: row.description ?? null,
    startSec: row.startSec ?? 0,
    endSec: row.endSec ?? null,
    playToEnd: row.playToEnd ?? false,
    durationSec: row.durationSec ?? null,
    anonymous: row.anonymous ?? false,
    status: row.status,
    rejectReason: row.rejectReason,
    username: row.anonymous ? "익명" : row.sender.username,
    senderId: row.senderId,
    message: row.tip.message,
    at: row.createdAt.getTime(),
  };
}

export function displayDonorName(username: string, anonymous: boolean): string {
  return anonymous ? "익명" : username;
}

import { db } from "@/lib/db";
import { normalizeYoutubeUrl, extractYoutubeVideoId } from "@/lib/video-donation";
import { validateYoutubeForDonation } from "@/lib/youtube/data-api";
import {
  checkVideoDonationBlocklist,
  parseVideoDonationBlocklist,
} from "@/lib/moco-donation/video-blocklist";
import {
  DEFAULT_VIDEO_RATE_CENTI_PER_10_SEC,
  normalizeVideoMaxSec,
  normalizeVideoRateCenti,
  quoteVideoDonation,
  type VideoDonationQuote,
} from "@/lib/moco-donation/video-pricing";

export type PrepareVideoDonationInput = {
  channelId: string;
  mediaUrl: string;
  /** Playback length in seconds. Server is the source of truth. */
  playSec?: number;
  startSec?: number;
  endSec?: number | null;
  playToEnd?: boolean;
};

export type PrepareVideoDonationResult =
  | {
      ok: true;
      videoId: string;
      mediaUrl: string;
      videoTitle: string;
      youtubeChannelId: string;
      durationSec: number;
      maxPlaySec: number;
      startSec: number;
      endSec: number;
      playToEnd: false;
      quote: VideoDonationQuote;
      enabled: true;
    }
  | { ok: false; error: string; code?: string };

async function loadChannelVideoPolicy(channelId: string) {
  const ch = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      isLive: true,
      liveStatus: true,
      videoDonationEnabled: true,
      videoDonationMaxSec: true,
      videoDonationRateCentiPer10Sec: true,
      videoDonationBlocklistJson: true,
    },
  });
  return ch;
}

export async function prepareMocoVideoDonation(
  input: PrepareVideoDonationInput
): Promise<PrepareVideoDonationResult> {
  const channel = await loadChannelVideoPolicy(input.channelId);
  if (!channel) return { ok: false, error: "Stream not found.", code: "NOT_FOUND" };
  if (!channel.isLive || channel.liveStatus !== "LIVE") {
    return { ok: false, error: "Video donations are only available while the stream is live.", code: "NOT_LIVE" };
  }
  if (!channel.videoDonationEnabled) {
    return { ok: false, error: "This creator has turned video donations off.", code: "VIDEO_DONATIONS_DISABLED" };
  }

  const normalized = normalizeYoutubeUrl(input.mediaUrl.trim());
  if (!normalized) {
    return { ok: false, error: "Check the YouTube URL.", code: "INVALID_URL" };
  }
  const videoId = extractYoutubeVideoId(normalized);
  if (!videoId) {
    return { ok: false, error: "Could not extract the YouTube video ID.", code: "INVALID_URL" };
  }

  const maxPlaySec = normalizeVideoMaxSec(channel.videoDonationMaxSec);
  const rate = normalizeVideoRateCenti(
    channel.videoDonationRateCentiPer10Sec || DEFAULT_VIDEO_RATE_CENTI_PER_10_SEC
  );

  const startSec = Math.max(0, Math.floor(input.startSec ?? 0));
  let playSec = Math.floor(input.playSec ?? 0);
  if (playSec <= 0 && input.endSec != null && Number.isFinite(input.endSec)) {
    playSec = Math.floor(input.endSec) - startSec;
  }
  if (playSec <= 0 && input.playToEnd) {
    playSec = maxPlaySec;
  }
  if (playSec <= 0) {
    return { ok: false, error: "Choose how long the video should play.", code: "PLAY_SEC_REQUIRED" };
  }

  const yt = await validateYoutubeForDonation({ videoId, segmentSec: playSec });
  if (!yt.ok) {
    return { ok: false, error: yt.error, code: yt.code };
  }

  const durationSec = yt.meta.durationSec;
  if (startSec >= durationSec) {
    return { ok: false, error: "Start time exceeds the video length.", code: "YOUTUBE_BAD_START" };
  }
  if (startSec + playSec > durationSec) {
    return {
      ok: false,
      error: "Playback length cannot be longer than the video.",
      code: "YOUTUBE_SEGMENT_TOO_LONG",
    };
  }
  if (playSec > maxPlaySec) {
    return {
      ok: false,
      error: `This creator allows up to ${maxPlaySec} seconds.`,
      code: "ABOVE_MAX_SEC",
    };
  }

  const blocklist = parseVideoDonationBlocklist(channel.videoDonationBlocklistJson);
  const blocked = checkVideoDonationBlocklist({
    blocklist,
    videoId,
    channelId: yt.meta.channelId,
    title: yt.meta.title,
  });
  if (blocked) {
    return { ok: false, error: blocked, code: "BLOCKLIST" };
  }

  const quote = quoteVideoDonation(playSec, rate);
  if (!quote) {
    return { ok: false, error: "Could not price this video donation.", code: "BAD_PRICE" };
  }

  return {
    ok: true,
    videoId,
    mediaUrl: normalized,
    videoTitle: yt.meta.title,
    youtubeChannelId: yt.meta.channelId,
    durationSec,
    maxPlaySec,
    startSec,
    endSec: startSec + playSec,
    playToEnd: false,
    quote,
    enabled: true,
  };
}

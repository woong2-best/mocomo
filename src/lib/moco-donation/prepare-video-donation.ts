import { db } from "@/lib/db";
import { normalizeYoutubeUrl, extractYoutubeVideoId } from "@/lib/video-donation";
import { validateYoutubeForDonation } from "@/lib/youtube/data-api";
import {
  checkVideoDonationBlocklist,
  parseVideoDonationBlocklist,
} from "@/lib/moco-donation/video-blocklist";
import {
  calcMocoVideoDonationAmount,
  DEFAULT_MOCO_VIDEO_DONATION_RATES,
  type MocoVideoDonationChannelRates,
} from "@/lib/moco-donation/video-pricing";

export type PrepareVideoDonationInput = {
  channelId: string;
  mediaUrl: string;
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
      segmentSec: number;
      maxPlaySec: number;
      mocoAmount: number;
      rates: MocoVideoDonationChannelRates;
      startSec: number;
      endSec: number | null;
      playToEnd: boolean;
    }
  | { ok: false; error: string; code?: string };

async function loadChannelVideoRates(channelId: string) {
  const ch = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      videoDonationMaxSec: true,
      videoDonationRateMocoPerSec: true,
      videoDonationMinMoco: true,
      videoDonationBlocklistJson: true,
    },
  });
  const maxPlaySec = Math.min(
    300,
    Math.max(10, ch?.videoDonationMaxSec ?? DEFAULT_MOCO_VIDEO_DONATION_RATES.maxPlaySec)
  );
  const rates: MocoVideoDonationChannelRates = {
    rateMocoPerSec: Math.max(1, ch?.videoDonationRateMocoPerSec ?? DEFAULT_MOCO_VIDEO_DONATION_RATES.rateMocoPerSec),
    minMoco: Math.max(1, ch?.videoDonationMinMoco ?? DEFAULT_MOCO_VIDEO_DONATION_RATES.minMoco),
    maxPlaySec,
  };
  const blocklist = parseVideoDonationBlocklist(ch?.videoDonationBlocklistJson);
  return { rates, blocklist };
}

export async function prepareMocoVideoDonation(
  input: PrepareVideoDonationInput
): Promise<PrepareVideoDonationResult> {
  const normalized = normalizeYoutubeUrl(input.mediaUrl.trim());
  if (!normalized) {
    return { ok: false, error: "YouTube URL을 확인해 주세요.", code: "INVALID_URL" };
  }
  const videoId = extractYoutubeVideoId(normalized);
  if (!videoId) {
    return { ok: false, error: "YouTube Video ID를 추출할 수 없습니다.", code: "INVALID_URL" };
  }

  const startSec = Math.max(0, Math.floor(input.startSec ?? 0));
  const playToEnd = input.playToEnd === true;
  const endSec =
    input.endSec != null && Number.isFinite(input.endSec) ? Math.floor(input.endSec) : null;

  const { rates, blocklist } = await loadChannelVideoRates(input.channelId);
  const { segmentSec, mocoAmount } = calcMocoVideoDonationAmount({
    startSec,
    endSec,
    playToEnd,
    rates,
  });

  const yt = await validateYoutubeForDonation({ videoId, segmentSec });
  if (!yt.ok) {
    return { ok: false, error: yt.error, code: yt.code };
  }

  if (yt.meta.durationSec > 0 && startSec >= yt.meta.durationSec) {
    return { ok: false, error: "시작 시간이 영상 길이를 넘습니다.", code: "YOUTUBE_BAD_START" };
  }
  if (!playToEnd && endSec != null && yt.meta.durationSec > 0 && endSec > yt.meta.durationSec) {
    return { ok: false, error: "종료 시간이 영상 길이를 넘습니다.", code: "YOUTUBE_BAD_END" };
  }

  const blocked = checkVideoDonationBlocklist({
    blocklist,
    videoId,
    channelId: yt.meta.channelId,
    title: yt.meta.title,
  });
  if (blocked) {
    return { ok: false, error: blocked, code: "BLOCKLIST" };
  }

  if (mocoAmount < rates.minMoco) {
    return {
      ok: false,
      error: `영상 도네는 최소 ${rates.minMoco} MOCO부터 가능합니다.`,
      code: "BELOW_MIN_MOCO",
    };
  }

  return {
    ok: true,
    videoId,
    mediaUrl: normalized,
    videoTitle: yt.meta.title,
    youtubeChannelId: yt.meta.channelId,
    segmentSec,
    maxPlaySec: rates.maxPlaySec,
    mocoAmount,
    rates,
    startSec,
    endSec,
    playToEnd,
  };
}

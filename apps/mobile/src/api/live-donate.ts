import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type LiveDonateType = "SFX" | "VIDEO";

export type LiveDonateResponse = {
  success: boolean;
  donation_id?: string;
  remaining_moco?: number;
  error?: string;
  code?: string;
};

export type LiveVideoDonatePreviewResponse = {
  ok: boolean;
  video_id?: string;
  video_title?: string | null;
  duration_sec?: number;
  segment_sec?: number;
  play_sec?: number;
  max_play_sec?: number;
  moco_amount?: number;
  moco_label?: string;
  usd_cents?: number;
  start_sec?: number;
  end_sec?: number | null;
  play_to_end?: boolean;
  error?: string;
  code?: string;
};

export async function postLiveMocoDonation(
  channelId: string,
  body: {
    type: LiveDonateType;
    moco_amount?: number;
    media_url?: string;
    message?: string;
    sfx_key?: string;
    play_sec?: number;
    start_sec?: number;
    end_sec?: number | null;
    play_to_end?: boolean;
  }
) {
  return apiRequest<LiveDonateResponse>(MobileApi.liveDonate(channelId), {
    method: "POST",
    body,
    auth: true,
  });
}

export type LiveVideoDonationCard = {
  id: string;
  status: string;
  videoTitle: string | null;
  mocoLabel: string;
  username: string;
  senderId: string;
};

export async function fetchLiveVideoDonations(channelId: string) {
  return apiRequest<{
    ok: boolean;
    isHost: boolean;
    pendingCount: number;
    playing: LiveVideoDonationCard | null;
    queue: LiveVideoDonationCard[];
    mine: LiveVideoDonationCard[];
  }>(MobileApi.liveVideoDonations(channelId), { auth: true });
}

export async function postLiveVideoDonationAction(
  channelId: string,
  body: Record<string, unknown>
) {
  return apiRequest<{ ok: boolean }>(MobileApi.liveVideoDonations(channelId), {
    method: "POST",
    body,
    auth: true,
  });
}

export async function endLiveWithVideoCheck(channelId: string, confirmPending: boolean) {
  return apiRequest<{ ok: boolean; pendingCount?: number; message?: string }>(MobileApi.liveEnd(channelId), {
    method: "POST",
    body: { confirmPending },
    auth: true,
  });
}

export async function previewLiveVideoDonation(
  channelId: string,
  body: {
    media_url: string;
    play_sec?: number;
    start_sec?: number;
    end_sec?: number | null;
    play_to_end?: boolean;
  }
) {
  return apiRequest<LiveVideoDonatePreviewResponse>(MobileApi.liveDonateVideoPreview(channelId), {
    method: "POST",
    body,
    auth: true,
  });
}

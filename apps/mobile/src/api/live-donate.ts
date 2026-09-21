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
  segment_sec?: number;
  max_play_sec?: number;
  moco_amount?: number;
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

export async function previewLiveVideoDonation(
  channelId: string,
  body: {
    media_url: string;
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

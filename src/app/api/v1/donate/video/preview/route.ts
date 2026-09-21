import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveDonateApiUser } from "@/lib/moco-donation/api-auth";
import { resolveStreamerTarget } from "@/lib/moco-donation/resolve-streamer";
import { prepareMocoVideoDonation } from "@/lib/moco-donation/prepare-video-donation";

/** 영상 도네 — URL·구간 검증 + MOCO 견적 (결제 전) */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "v1-donate-video-preview", 40);
  if (limited) return limited;

  const userResult = await resolveDonateApiUser(req);
  if (!userResult.ok) return userResult.response;

  let body: {
    streamer_id?: string;
    media_url?: string;
    start_sec?: number;
    end_sec?: number;
    play_to_end?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const streamerId = body.streamer_id?.trim();
  if (!streamerId) {
    return NextResponse.json({ ok: false, error: "streamer_id가 필요합니다." }, { status: 400 });
  }

  const target = await resolveStreamerTarget(streamerId);
  if (!target.ok) {
    return NextResponse.json({ ok: false, error: target.error }, { status: 400 });
  }
  if (!target.isLive) {
    return NextResponse.json({ ok: false, error: "방송 중일 때만 미리보기할 수 있습니다." }, { status: 400 });
  }

  const prepared = await prepareMocoVideoDonation({
    channelId: target.channelId,
    mediaUrl: body.media_url ?? "",
    startSec: body.start_sec,
    endSec: body.end_sec,
    playToEnd: body.play_to_end,
  });

  if (!prepared.ok) {
    return NextResponse.json({ ok: false, error: prepared.error, code: prepared.code }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    video_id: prepared.videoId,
    video_title: prepared.videoTitle,
    segment_sec: prepared.segmentSec,
    max_play_sec: prepared.maxPlaySec,
    moco_amount: prepared.mocoAmount,
    rate_moco_per_sec: prepared.rates.rateMocoPerSec,
    min_moco: prepared.rates.minMoco,
    start_sec: prepared.startSec,
    end_sec: prepared.endSec,
    play_to_end: prepared.playToEnd,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { prepareMocoVideoDonation } from "@/lib/moco-donation/prepare-video-donation";

/** Mobile — YouTube 영상 도네 견적 (Bearer) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-donate-video-preview", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ ok: false, error: "방송에 참여한 뒤 미리보기할 수 있습니다." }, { status: 403 });
  }

  let body: {
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

  const prepared = await prepareMocoVideoDonation({
    channelId,
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
    start_sec: prepared.startSec,
    end_sec: prepared.endSec,
    play_to_end: prepared.playToEnd,
  });
}

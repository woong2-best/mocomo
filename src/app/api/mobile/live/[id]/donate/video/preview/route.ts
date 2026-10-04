import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { prepareMocoVideoDonation } from "@/lib/moco-donation/prepare-video-donation";

/** Mobile — YouTube Video 도네 견적 (Bearer) */
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
    return NextResponse.json({ ok: false, error: "Join the stream before previewing." }, { status: 403 });
  }

  let body: {
    media_url?: string;
    play_sec?: number;
    start_sec?: number;
    end_sec?: number;
    play_to_end?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const prepared = await prepareMocoVideoDonation({
    channelId,
    mediaUrl: body.media_url ?? "",
    playSec: body.play_sec,
    startSec: body.start_sec,
    endSec: body.end_sec,
    playToEnd: body.play_to_end,
  });

  if (!prepared.ok) {
    return NextResponse.json({ ok: false, error: errorText(prepared.error), code: prepared.code }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    video_id: prepared.videoId,
    video_title: prepared.videoTitle,
    duration_sec: prepared.durationSec,
    segment_sec: prepared.quote.playSec,
    play_sec: prepared.quote.playSec,
    billed_sec: prepared.quote.billedSec,
    max_play_sec: prepared.maxPlaySec,
    moco_amount: prepared.quote.mocoCenti / 100,
    moco_centi: prepared.quote.mocoCenti,
    moco_label: prepared.quote.mocoLabel,
    usd_cents: prepared.quote.usdCents,
    start_sec: prepared.startSec,
    end_sec: prepared.endSec,
    play_to_end: false,
  });
}

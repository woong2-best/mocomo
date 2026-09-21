import { NextRequest, NextResponse } from "next/server";
import type { MocoDonationType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { createMocoDonation } from "@/lib/moco-donation/service";

const VALID_TYPES = new Set<MocoDonationType>(["VIDEO", "SFX"]);

/** Mobile alias — same as POST /api/v1/donate (Bearer auth) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-moco-donate", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "방송에 참여한 뒤 후원할 수 있습니다." }, { status: 403 });
  }

  let body: {
    moco_amount?: number;
    type?: string;
    media_url?: string;
    message?: string;
    sfx_key?: string;
    start_sec?: number;
    end_sec?: number;
    play_to_end?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const type = (body.type?.toUpperCase() ?? "SFX") as MocoDonationType;
  if (type === "TTS" || type === "CHAT") {
    return NextResponse.json(
      {
        success: false,
        error: "채팅/TTS 후원은 종료되었습니다. SFX 후원을 이용해 주세요.",
        code: "LEGACY_TYPE_DEPRECATED",
      },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { success: false, error: "type은 SFX 또는 VIDEO입니다." },
      { status: 400 }
    );
  }

  const result = await createMocoDonation({
    userId: authResult.user.id,
    streamerId: channelId,
    mocoAmount: body.moco_amount != null ? Math.floor(Number(body.moco_amount)) : undefined,
    type,
    mediaUrl: body.media_url,
    message: body.message,
    sfxKey: body.sfx_key,
    startSec: body.start_sec,
    endSec: body.end_sec,
    playToEnd: body.play_to_end,
  });

  if (!result.success) {
    const status = result.code === "INSUFFICIENT_MOCO" ? 402 : 400;
    return NextResponse.json({ success: false, error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    success: true,
    donation_id: result.donationId,
    remaining_moco: result.remainingMoco,
  });
}

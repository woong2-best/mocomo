import { NextRequest, NextResponse } from "next/server";
import type { MocoDonationType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveDonateApiUser } from "@/lib/moco-donation/api-auth";
import { createMocoDonation } from "@/lib/moco-donation/service";

const VALID_TYPES = new Set<MocoDonationType>(["VIDEO", "SFX"]);

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "v1-donate", 30);
  if (limited) return limited;

  const userResult = await resolveDonateApiUser(req);
  if (!userResult.ok) return userResult.response;

  let body: {
    streamer_id?: string;
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

  const streamerId = body.streamer_id?.trim();
  if (!streamerId) {
    return NextResponse.json({ success: false, error: "streamer_id가 필요합니다." }, { status: 400 });
  }

  const typeRaw = (body.type?.toUpperCase() ?? "SFX") as MocoDonationType;
  if (typeRaw === "TTS" || typeRaw === "CHAT") {
    return NextResponse.json(
      {
        success: false,
        error: "채팅/TTS 후원은 종료되었습니다. SFX(효과음) 후원을 이용해 주세요.",
        code: "LEGACY_TYPE_DEPRECATED",
      },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.has(typeRaw)) {
    return NextResponse.json(
      { success: false, error: "type은 SFX 또는 VIDEO입니다." },
      { status: 400 }
    );
  }

  const result = await createMocoDonation({
    userId: userResult.userId,
    streamerId,
    mocoAmount: body.moco_amount != null ? Math.floor(Number(body.moco_amount)) : undefined,
    type: typeRaw,
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
    channel_id: result.channelId,
  });
}

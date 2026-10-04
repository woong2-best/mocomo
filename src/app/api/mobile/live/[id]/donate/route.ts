import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import type { MocoDonationType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { createMocoDonation } from "@/lib/moco-donation/service";
import { stripeAccountNotReadyPayload } from "@/lib/creator-payout-ready";

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
    return NextResponse.json({ error: "Join the stream before donating." }, { status: 403 });
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
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const type = (body.type?.toUpperCase() ?? "SFX") as MocoDonationType;
  if (type === "TTS" || type === "CHAT") {
    return NextResponse.json(
      {
        success: false,
        error: "Chat/TTS donations are closed. Please use SFX donations.",
        code: "LEGACY_TYPE_DEPRECATED",
      },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { success: false, error: "type must be SFX or VIDEO." },
      { status: 400 }
    );
  }

  const result = await createMocoDonation({
    userId: authResult.user.id,
    streamerId: channelId,
    mocoAmount: body.moco_amount != null ? Number(body.moco_amount) : undefined,
    type,
    mediaUrl: body.media_url,
    message: body.message,
    sfxKey: body.sfx_key,
    startSec: body.start_sec,
    endSec: body.end_sec,
    playToEnd: body.play_to_end,
  });

  if (!result.success) {
    if (result.code === "STRIPE_ACCOUNT_NOT_READY") {
      return NextResponse.json({ success: false, ...stripeAccountNotReadyPayload() }, { status: 422 });
    }
    const status = result.code === "INSUFFICIENT_MOCO" ? 402 : 400;
    return NextResponse.json({ success: false, error: errorText(result.error), code: result.code }, { status });
  }

  return NextResponse.json({
    success: true,
    donation_id: result.donationId,
    remaining_moco: result.remainingMoco,
  });
}

import { NextRequest, NextResponse } from "next/server";
import type { LiveSupportEventType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { sendLiveSupportCheerRest } from "@/lib/live-support/rest-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-support-cheer", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "방송에 참여한 뒤 응원할 수 있습니다." }, { status: 403 });
  }

  let body: {
    type?: LiveSupportEventType;
    amount?: number;
    message?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await sendLiveSupportCheerRest({
    userId: authResult.user.id,
    channelId,
    type: body.type ?? "GENERAL",
    amount: Math.floor(Number(body.amount) || 0),
    message: typeof body.message === "string" ? body.message : undefined,
    metadata: body.metadata,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, event: result.event });
}

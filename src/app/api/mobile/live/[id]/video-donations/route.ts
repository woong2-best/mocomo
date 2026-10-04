import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { applyVideoDonationAction, getVideoDonationRoomState } from "@/lib/moco-donation/room-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-video-donations", 120);
  if (limited) return limited;
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;
  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Join the stream first." }, { status: 403 });
  const state = await getVideoDonationRoomState(channelId, authResult.user.id);
  if (!state) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-video-donations-write", 60);
  if (limited) return limited;
  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Join the stream first." }, { status: 403 });

  let body: {
    action?: string;
    donationId?: string;
    volume?: number;
    enabled?: boolean;
    maxSec?: number;
    rateMoco?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = await applyVideoDonationAction({
    channelId,
    userId: authResult.user.id,
    action: body.action ?? "",
    donationId: body.donationId,
    volume: body.volume,
    enabled: body.enabled,
    maxSec: body.maxSec,
    rateMoco: body.rateMoco,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

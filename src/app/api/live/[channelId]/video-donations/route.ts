import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { applyVideoDonationAction, getVideoDonationRoomState } from "@/lib/moco-donation/room-api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-video-donations", 120);
  if (limited) return limited;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  const state = await getVideoDonationRoomState(channelId, session.user.id);
  if (!state) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-video-donations-write", 60);
  if (limited) return limited;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const { channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });

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
    userId: session.user.id,
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

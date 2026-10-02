import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const LIVE_DENY: Record<string, string> = {
  NOT_FOUND: "Stream not found.",
  NOT_LIVE: "This broadcast has ended.",
  NOT_MEMBER: "You don't have permission to watch.",
  TIER_REQUIRED: "Please check your input and try again.",
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }

    const limited = await rateLimitPublicApi(req, `livekit:${session.user.id}`, 30);
    if (limited) return limited;

    const room = req.nextUrl.searchParams.get("room");
    if (!room) {
      return NextResponse.json({ error: "room required" }, { status: 400 });
    }

    if (!isLivekitConfigured()) {
      return NextResponse.json(
        { error: "Not found." },
        { status: 503 }
      );
    }

    const displayName =
      session.user.username || session.user.name || session.user.id;

    if (room.startsWith("call-")) {
      return NextResponse.json(
        { error: "Required field missing." },
        { status: 400 }
      );
    }

    const live = await resolveLiveChannelAccess(room, session.user.id);
    if (!live.allowed) {
      return NextResponse.json(
        { error: LIVE_DENY[live.reason] ?? "You don't have permission to do that.", reason: live.reason },
        { status: 403 }
      );
    }

    const channelRow = await db.voiceChannel.findUnique({
      where: { id: room },
      select: { broadcastMode: true },
    });
    const isVoiceLive = channelRow?.broadcastMode === "VOICE";
    const hostObsMode = live.isHost && channelRow?.broadcastMode === "OBS";
    const member = await db.voiceMember.findUnique({
      where: { channelId_userId: { channelId: room, userId: session.user.id } },
      select: { role: true },
    });
    const canPublish =
      !isVoiceLive &&
      ((live.isHost && !hostObsMode) || member?.role === "CO_HOST");
    const voiceHostPublish = isVoiceLive && live.isHost;

    const token = await createLivekitToken(room, session.user.id, displayName, {
      publish: canPublish || voiceHostPublish,
      audioOnly: isVoiceLive,
    });
    if (!token) {
      return NextResponse.json({ error: "Request failed." }, { status: 503 });
    }

    const serverUrl = getLivekitUrl();
    if (!serverUrl) {
      return NextResponse.json({ error: "Required field missing." }, { status: 503 });
    }

    return NextResponse.json({
      token,
      serverUrl,
      role: live.isHost ? "host" : "viewer",
      hostUserId: live.hostUserId,
      audioOnly: isVoiceLive,
    });
  } catch (e) {
    console.error("[api/livekit/token]", e);
    return NextResponse.json(
      { error: "Request failed.", reason: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

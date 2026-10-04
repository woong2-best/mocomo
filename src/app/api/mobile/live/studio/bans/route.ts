import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  banStreamerViewer,
  listStreamerChatBans,
  unbanStreamerViewer,
} from "@/lib/live-broadcast/streamer-studio";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-bans", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const bans = await listStreamerChatBans(auth.user.id);
  return NextResponse.json({ bans });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-ban", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) return NextResponse.json({ error: "MoCoMo user not found." }, { status: 400 });

  const result = await banStreamerViewer({
    hostUserId: auth.user.id,
    actorId: auth.user.id,
    targetUserId: userId,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-unban", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) return NextResponse.json({ error: "MoCoMo user not found." }, { status: 400 });

  const result = await unbanStreamerViewer({
    hostUserId: auth.user.id,
    actorId: auth.user.id,
    targetUserId: userId,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  banLiveChatUser,
  listLiveChatBans,
  timeoutLiveChatUser,
  unbanLiveChatUser,
} from "@/lib/live-broadcast/chat-access";
import { requireBroadcastPermission } from "@/lib/live-broadcast/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const perm = await requireBroadcastPermission(session.user.id, channelId, "chat.ban");
  if (!perm.ok) {
    return NextResponse.json({ error: perm.error }, { status: 403 });
  }

  const bans = await listLiveChatBans(channelId);
  return NextResponse.json({ ok: true, bans });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "live-mod-action", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  let body: { action?: string; targetUserId?: string; durationSeconds?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId가 필요합니다." }, { status: 400 });
  }

  const action = body.action?.trim();
  let result: { error?: string; success?: true; expiresAt?: string };

  switch (action) {
    case "timeout":
      result = await timeoutLiveChatUser({
        channelId,
        actorId: session.user.id,
        targetUserId,
        durationSeconds: body.durationSeconds ?? 300,
      });
      break;
    case "ban":
      result = await banLiveChatUser({
        channelId,
        actorId: session.user.id,
        targetUserId,
        reason: body.reason,
      });
      break;
    case "unban":
      result = await unbanLiveChatUser({
        channelId,
        actorId: session.user.id,
        targetUserId,
      });
      break;
    default:
      return NextResponse.json({ error: "알 수 없는 action입니다." }, { status: 400 });
  }

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true, ...result });
}

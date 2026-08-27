import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import {
  createLiveSupportMissionRest,
  listLiveSupportMissions,
} from "@/lib/live-support/rest-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-missions-get", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const missions = await listLiveSupportMissions(channelId);
  return NextResponse.json({ ok: true, missions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-missions-post", 20);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "방송에 참여한 뒤 미션을 등록할 수 있습니다." }, { status: 403 });
  }

  let body: { title?: string; rewardAmount?: number; deadlineMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await createLiveSupportMissionRest({
    userId: authResult.user.id,
    channelId,
    title: String(body.title ?? ""),
    rewardAmount: Math.floor(Number(body.rewardAmount) || 0),
    deadlineMinutes: body.deadlineMinutes,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mission: result.mission });
}

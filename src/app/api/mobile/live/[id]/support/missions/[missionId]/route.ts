import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveSupportMissionRest } from "@/lib/live-support/rest-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; missionId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-mission-resolve", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { missionId } = await params;
  let body: { status?: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: "상태가 필요합니다." }, { status: 400 });
  }

  const result = await resolveLiveSupportMissionRest({
    userId: authResult.user.id,
    missionId,
    status: body.status,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mission: result.mission });
}

import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { voteLiveSupportPollRest } from "@/lib/live-support/rest-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-poll-vote", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  void params;

  let body: { pollId?: string; optionId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.pollId || !body.optionId) {
    return NextResponse.json({ error: "선택지를 골라 주세요." }, { status: 400 });
  }

  const result = await voteLiveSupportPollRest({
    userId: authResult.user.id,
    pollId: body.pollId,
    optionId: body.optionId,
    amount: body.amount,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, poll: result.poll, event: result.event });
}

import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { castPostPollVote } from "@/lib/post-poll";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-poll-vote", 40);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: postId } = await ctx.params;
  let body: { optionId?: string };
  try {
    body = (await req.json()) as { optionId?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const optionId = body.optionId?.trim();
  if (!optionId) {
    return NextResponse.json({ error: "선택지를 지정해 주세요." }, { status: 400 });
  }

  const result = await castPostPollVote(postId, userId, optionId);
  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: result.status });
  }
  return NextResponse.json({ poll: result.poll });
}

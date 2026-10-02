import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { castPostPollVote } from "@/lib/post-poll";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-poll-vote", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id: postId } = await ctx.params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let body: { optionId?: string };
  try {
    body = (await req.json()) as { optionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const optionId = body.optionId?.trim();
  if (!optionId) {
    return NextResponse.json({ error: "Select an option." }, { status: 400 });
  }

  const result = await castPostPollVote(postId, authResult.user.id, optionId);
  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: result.status });
  }
  return NextResponse.json({ poll: result.poll });
}

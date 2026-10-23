import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { acceptQnaAnswer } from "@/lib/qna-bounty";
import { revalidatePath } from "next/cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-qna-accept-answer", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id: postId } = await params;
  let commentId = "";
  try {
    const body = (await req.json()) as { commentId?: string };
    commentId = String(body.commentId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!postId || !commentId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await acceptQnaAnswer({ actorId: auth.user.id, postId, commentId });
  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  revalidatePath(`/post/${postId}`);
  return NextResponse.json({ ok: true });
}

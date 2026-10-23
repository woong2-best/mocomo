import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { acceptQnaAnswer } from "@/lib/qna-bounty";
import { revalidatePath } from "next/cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "qna-accept-answer", 20);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

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

  const result = await acceptQnaAnswer({ actorId: userId, postId, commentId });
  if (!result.ok) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  revalidatePath(`/post/${postId}`);
  return NextResponse.json({ ok: true });
}

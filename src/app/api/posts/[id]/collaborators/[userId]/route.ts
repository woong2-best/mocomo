import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  CollaboratorError,
  removeCollaborator,
} from "@/lib/post-collaborators";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-collab-remove", 30);
  if (limited) return limited;

  const { id: postId, userId: targetUserId } = await params;
  if (!postId || postId.length > 64 || !targetUserId || targetUserId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  try {
    await removeCollaborator(postId, user.id, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CollaboratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/posts/collaborators DELETE]", e);
    return NextResponse.json({ error: "제거에 실패했습니다." }, { status: 500 });
  }
}
